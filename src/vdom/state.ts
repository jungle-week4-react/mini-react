import type { VNode } from './node.js';
import { render } from './scheduler.js';
import type { FiberRoot } from './fiber.js';

export type SetStateAction<State> =
  | State
  | ((previousState: State) => State);

export type StateRenderer<State> = (state: State) => VNode;

export type StatefulFiberRoot<State> = {
  getRoot: () => FiberRoot;
  getState: () => State;
  render: () => FiberRoot;
  setState: (action: SetStateAction<State>) => FiberRoot;
};

export function createStatefulRoot<State>(
  container: Element,
  initialState: State,
  renderView: StateRenderer<State>,
): StatefulFiberRoot<State> {
  let currentState = initialState;
  let currentRoot = render(renderView(currentState), container);

  function renderCurrentState(): FiberRoot {
    currentRoot = render(renderView(currentState), container);

    return currentRoot;
  }

  return {
    getRoot: () => currentRoot,
    getState: () => currentState,
    render: renderCurrentState,
    setState: (action) => {
      currentState = resolveStateAction(action, currentState);

      return renderCurrentState();
    },
  };
}

function resolveStateAction<State>(
  action: SetStateAction<State>,
  previousState: State,
): State {
  if (typeof action === 'function') {
    return (action as (previousState: State) => State)(previousState);
  }

  return action;
}
