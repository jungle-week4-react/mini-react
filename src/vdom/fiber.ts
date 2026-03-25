import type {
  ElementNodeKey,
  ElementNodeProps,
  ElementNodeUid,
} from './element-node.js';
import type { VNode } from './node.js';

// ROOT는 실제 container를 가리키는 가짜 루트 노드다.
// 일반 div/span 같은 host element와 구분하기 위해 별도 타입명을 쓴다.
export const ROOT_FIBER_TYPE = 'ROOT';
// text node는 tag 이름이 없으므로 별도 상수로 구분한다.
export const TEXT_FIBER_TYPE = '#text';
// 한 번의 브라우저 task에서 최대 몇 ms 동안 render를 진행할지 정한다.
export const YIELD_INTERVAL_MS = 5;

export type FiberType = typeof ROOT_FIBER_TYPE | typeof TEXT_FIBER_TYPE | string;
export type FiberKey = ElementNodeKey;
export type FiberUid = ElementNodeUid;
export type FiberProps = ElementNodeProps;
// beginWork가 자식 Fiber를 만들 때 읽는 입력 VNode 목록이다.
export type FiberUpdateQueue = VNode[];

export enum FiberFlags {
  // 변경 없음
  NoFlags = 0,
  // 새 DOM 삽입 또는 기존 DOM 이동이 필요
  Placement = 1 << 0,
  // 같은 DOM을 재사용하지만 속성/텍스트 변경이 필요
  Update = 1 << 1,
  // 기존 DOM 제거가 필요
  Deletion = 1 << 2,
}

export enum FiberRenderState {
  // 현재 예약된 일이 없음
  Idle = 'idle',
  // 업데이트 요청은 들어왔지만 아직 render loop는 시작하지 않음
  Triggered = 'triggered',
  // workLoop가 실제 Fiber를 처리 중
  Render = 'render',
  // render phase 계산은 끝났고 commit만 남음
  Completed = 'completed',
  // 실제 DOM 반영 중
  Commit = 'commit',
}

// Fiber는 "VDOM 노드 자체"라기보다 "렌더링 작업 단위"에 가깝다.
// 같은 VNode를 화면에 반영하기 위해 필요한 런타임 정보가 모두 여기에 붙는다.
export type Fiber = {
  // ROOT / #text / div / span ...
  type: FiberType;
  // 개발자가 준 key. 형제 목록에서 의미상 같은 노드를 찾는 기준이다.
  key: FiberKey;
  // key가 없을 때 내부적으로 쓰는 안정적인 fallback identity다.
  uid: FiberUid;
  // 현재 형제 목록에서 몇 번째 위치인지 기록한다.
  // reorder 판단에서 "예전 위치와 지금 위치"를 비교할 때 쓴다.
  index: number;
  // 현재 Fiber가 나타내는 DOM props
  props: FiberProps;
  // 실제 DOM 노드 참조. render에서는 준비하고 commit에서 붙인다.
  stateNode: Node | null;
  // current <-> workInProgress를 잇는 링크.
  // "지금 화면의 노드"와 "새로 계산 중인 노드"를 연결한다.
  alternate: Fiber | null;
  // 첫 번째 자식
  child: Fiber | null;
  // 다음 형제
  sibling: Fiber | null;
  // 부모 Fiber. 이름이 return인 이유는 자식 처리가 끝난 뒤 돌아갈 부모이기 때문이다.
  return: Fiber | null;
  // commit에서 어떤 DOM 작업을 해야 하는지 표시하는 비트마스크
  flags: FiberFlags;
  // beginWork에서 읽을 자식 VNode 배열
  updateQueue: FiberUpdateQueue | null;
  // 삭제 대상은 부모 Fiber에 모아둔다.
  deletions: Fiber[] | null;
};

// FiberRoot는 개별 노드가 아니라 "컨테이너 하나를 관리하는 관리자"다.
export type FiberRoot = {
  // 실제 브라우저 마운트 지점
  container: Element;
  // 현재 화면에 반영된 Fiber 트리의 루트
  current: Fiber;
  // render/commit이 어느 단계인지 추적
  status: FiberRenderState;
};

// fiberRuntime은 "지금 이 순간 render loop가 어디까지 진행됐는가"를 담는 전역 작업 상태다.
export type FiberRuntime = {
  // 다음에 처리할 작업 단위
  nextUnitOfWork: Fiber | null;
  // 지금 만들고 있는 workInProgress 트리의 루트 Fiber
  workInProgress: Fiber | null;
  // 지금 작업 중인 root 관리자
  workInProgressRoot: FiberRoot | null;
  // shouldYield가 비교할 "이번 task의 마감 시각"
  renderDeadline: number;
  // MessageChannel 콜백이 이미 예약됐는지 표시
  isHostCallbackScheduled: boolean;
};

export type FiberStatusListener = (
  root: FiberRoot,
  status: FiberRenderState,
) => void;

export type FiberWorkSliceListener = (
  root: FiberRoot,
  summary: {
    sliceCount: number;
    processedFibers: number;
    elapsedMs: number;
  },
) => void;

export type FiberRenderSummaryListener = (
  root: FiberRoot,
  summary: {
    sliceCount: number;
    processedFibers: number;
    elapsedMs: number;
  },
) => void;

export type FiberCommitSummaryListener = (
  root: FiberRoot,
  summary: {
    selectionElapsedMs: number;
    applyElapsedMs: number;
    operationCount: number;
    placementCount: number;
    updateCount: number;
    deletionCount: number;
  },
) => void;

export const fiberRuntime: FiberRuntime = {
  nextUnitOfWork: null,
  workInProgress: null,
  workInProgressRoot: null,
  renderDeadline: 0,
  isHostCallbackScheduled: false,
};

const fiberStatusListeners = new Set<FiberStatusListener>();
const fiberWorkSliceListeners = new Set<FiberWorkSliceListener>();
const fiberRenderSummaryListeners = new Set<FiberRenderSummaryListener>();
const fiberCommitSummaryListeners = new Set<FiberCommitSummaryListener>();

export function createFiber(
  type: FiberType,
  key: FiberKey,
  uid: FiberUid,
  props: FiberProps,
  stateNode: Node | null,
): Fiber {
  return {
    // 이 Fiber가 어떤 DOM / text / root를 표현하는지
    type,
    // 개발자가 준 key
    key,
    // key가 없을 때 내부적으로 쓰는 fallback identity
    uid,
    // 형제 순서
    index: 0,
    // 현재 props
    props,
    // 실제 DOM 참조
    stateNode,
    // current <-> workInProgress 연결
    alternate: null,
    // Fiber 트리를 linked list처럼 순회하기 위한 포인터들
    child: null,
    sibling: null,
    return: null,
    // commit에서 어떤 작업을 해야 하는지
    flags: FiberFlags.NoFlags,
    // 아직 Fiber로 바꾸지 않은 자식 VNode 목록
    updateQueue: null,
    // 삭제 대상 목록
    deletions: null,
  };
}

export function createFiberRoot(container: Element): FiberRoot {
  // ROOT Fiber는 실제 DOM container를 가리키는 특수 노드다.
  const hostRootFiber = createFiber(ROOT_FIBER_TYPE, null, 'root', {}, container);

  return {
    container,
    current: hostRootFiber,
    status: FiberRenderState.Idle,
  };
}

export function createWorkInProgress(
  current: Fiber,
  props: FiberProps,
): Fiber {
  // current.alternate가 곧 "이 current와 짝을 이루는 WIP 객체"다.
  let currentAlternate = current.alternate;

  if (currentAlternate === null) {
    // 첫 렌더면 아직 짝 alternate가 없으니 새 객체를 만든다.
    currentAlternate = createFiber(
      current.type,
      current.key,
      current.uid,
      props,
      current.stateNode,
    );
    // 서로를 alternate로 연결해두면 다음 렌더부터 재사용 가능하다.
    currentAlternate.alternate = current;
    current.alternate = currentAlternate;
  } else {
    // 재렌더면 이전 WIP 객체를 버리지 않고 다시 덮어써서 재사용한다.
    currentAlternate.type = current.type;
    currentAlternate.key = current.key;
    currentAlternate.uid = current.uid;
    currentAlternate.index = current.index;
    currentAlternate.props = props;
    currentAlternate.stateNode = current.stateNode;
    currentAlternate.flags = FiberFlags.NoFlags;
    currentAlternate.updateQueue = current.updateQueue;
    currentAlternate.deletions = null;
  }

  // 새 렌더를 시작할 때 child/sibling/return은 이전 계산 결과가 섞이면 안 된다.
  // 그래서 항상 비워놓고 beginWork에서 다시 연결한다.
  currentAlternate.child = null;
  currentAlternate.sibling = null;
  currentAlternate.return = null;

  return currentAlternate;
}

export function subscribeFiberStatus(
  listener: FiberStatusListener,
): () => void {
  // 데모 UI에서 상태 변화를 보여주기 위해 listener를 등록한다.
  fiberStatusListeners.add(listener);

  return () => {
    fiberStatusListeners.delete(listener);
  };
}

export function subscribeFiberWorkSlice(
  listener: FiberWorkSliceListener,
): () => void {
  fiberWorkSliceListeners.add(listener);

  return () => {
    fiberWorkSliceListeners.delete(listener);
  };
}

export function subscribeFiberRenderSummary(
  listener: FiberRenderSummaryListener,
): () => void {
  fiberRenderSummaryListeners.add(listener);

  return () => {
    fiberRenderSummaryListeners.delete(listener);
  };
}

export function subscribeFiberCommitSummary(
  listener: FiberCommitSummaryListener,
): () => void {
  fiberCommitSummaryListeners.add(listener);

  return () => {
    fiberCommitSummaryListeners.delete(listener);
  };
}

export function setFiberStatus(
  root: FiberRoot,
  status: FiberRenderState,
): void {
  // 현재 root 상태 갱신
  root.status = status;

  // 상태가 바뀔 때마다 구독자에게 알려 데모 로그를 갱신한다.
  for (const listener of fiberStatusListeners) {
    listener(root, status);
  }
}

export function emitFiberWorkSlice(
  root: FiberRoot,
  summary: {
    sliceCount: number;
    processedFibers: number;
    elapsedMs: number;
  },
): void {
  for (const listener of fiberWorkSliceListeners) {
    listener(root, summary);
  }
}

export function emitFiberRenderSummary(
  root: FiberRoot,
  summary: {
    sliceCount: number;
    processedFibers: number;
    elapsedMs: number;
  },
): void {
  for (const listener of fiberRenderSummaryListeners) {
    listener(root, summary);
  }
}

export function emitFiberCommitSummary(
  root: FiberRoot,
  summary: {
    selectionElapsedMs: number;
    applyElapsedMs: number;
    operationCount: number;
    placementCount: number;
    updateCount: number;
    deletionCount: number;
  },
): void {
  for (const listener of fiberCommitSummaryListeners) {
    listener(root, summary);
  }
}
