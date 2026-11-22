import React from 'react';
import { Composition } from 'remotion';
import { Demo, FPS, TOTAL } from './Demo';
export const Root = () => <Composition id="Demo" component={Demo} durationInFrames={TOTAL * FPS} fps={FPS} width={1920} height={1080} />;
