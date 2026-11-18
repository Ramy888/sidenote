// T4 probe (day 1): Firebase AI Logic for Apple on the simulator. Runs only when launched with
// SIDENOTE_T4=1. Checks: on-device text, @Generable output, lookupTerm tool round trip, and the
// hybrid model (Gemini primary, on-device secondary) reporting where it ran.
import FirebaseAILogic
import FirebaseCore
import FoundationModels

@available(iOS 26.0, *)
final class ToolCalls: @unchecked Sendable { var phrases: [String] = [] }

@available(iOS 26.0, *)
struct LookupTerm: FoundationModels.Tool {
  let calls: ToolCalls
  let name = "lookupTerm"
  let description = "Look up the medical vocabulary term ID for a short phrase a patient used."
  @Generable struct Arguments { @Guide(description: "the patient's phrase, word for word") var phrase: String }
  func call(arguments: Arguments) async throws -> String {
    calls.phrases.append(arguments.phrase)
    let p = arguments.phrase.lowercased()
    return p.contains("ache") || p.contains("muscle") ? "termId: MYALGIA_001 (muscle aches)" : "termId: none"
  }
}

@available(iOS 26.0, *)
@Generable struct Fact {
  @Guide(description: "symptom phrase copied word for word") var quote: String
  var daysAgo: Int
}

enum T4Probe {
  static let onDeviceName = "apple-foundation-models-system-language-model"
  static func log(_ step: String, _ detail: String) { print("[T4] \(step): \(detail)") }

  /// One retry: the first on-device call after boot can fail once (tokengeneration code 10).
  static func attempt<T>(_ step: String, _ body: () async throws -> T) async -> T? {
    for n in 1...2 {
      do { return try await body() } catch { log(step, "try \(n) failed: \(error)") }
    }
    return nil
  }

  static func run() async {
    guard #available(iOS 26.0, *) else { log("skip", "needs iOS 26"); return }
    let ai = FirebaseAI.firebaseAI(backend: .googleAI())

    if let r = await attempt("text", {
      try await ai.generativeModelSession(model: .systemModel(), instructions: "Answer in one short sentence.")
        .respond(to: "What is ankle swelling called medically?")
    }) { log("text", "\(r.content) | ran: \(r.rawResponse.modelVersion)") }

    if let r = await attempt("generable", {
      try await ai.generativeModelSession(model: .systemModel())
        .respond(to: "Message sent 3 days ago: \"my legs ache so much\". Extract the fact.", generating: Fact.self)
    }) { log("generable", "quote=\(r.content.quote) daysAgo=\(r.content.daysAgo) | ran: \(r.rawResponse.modelVersion)") }

    let calls = ToolCalls()
    if let r = await attempt("tool", {
      try await ai.generativeModelSession(model: .systemModel(), tools: [LookupTerm(calls: calls)],
        instructions: "Always call lookupTerm for the patient's symptom phrase, then answer with the term ID only.")
        .respond(to: "Patient wrote: \"my legs ache so much\". What is the term ID?")
    }) { log("tool", "calls=\(calls.phrases) reply=\(r.content) | ran: \(r.rawResponse.modelVersion)") }

    if let r = await attempt("hybrid", {
      try await ai.generativeModelSession(model: .hybridModel(primary: .geminiModel(name: "gemini-3.5-flash-lite"), secondary: .systemModel()))
        .respond(to: "Reply with exactly one word: ready")
    }) { log("hybrid", "\(r.content) | ran: \(r.rawResponse.modelVersion) | on device: \(r.rawResponse.modelVersion == onDeviceName)") }
    // Fallback check: a primary that always fails (unknown model) must hand over to the device.
    if let r = await attempt("hybrid-fallback", {
      try await ai.generativeModelSession(model: .hybridModel(primary: .geminiModel(name: "no-such-model-sidenote"), secondary: .systemModel()))
        .respond(to: "Reply with exactly one word: ready")
    }) { log("hybrid-fallback", "\(r.content) | ran: \(r.rawResponse.modelVersion) | on device: \(r.rawResponse.modelVersion == onDeviceName)") }
    log("done", "")
  }
}
