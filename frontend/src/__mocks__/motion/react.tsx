import React from 'react';

function createMotionComponent(tag: string) {
  return React.forwardRef(({ children, initial, animate, exit, whileHover, whileInView, viewport, transition, ...props }: any, ref: any) => {
    return React.createElement(tag, { ...props, ref }, children);
  });
}

export const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  p: createMotionComponent('p'),
  button: createMotionComponent('button'),
  a: createMotionComponent('a'),
  section: createMotionComponent('section'),
  li: createMotionComponent('li'),
  ul: createMotionComponent('ul'),
  img: createMotionComponent('img'),
  nav: createMotionComponent('nav'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
};

export function AnimatePresence({ children }: any) {
  return <>{children}</>;
}
