# 트리 - 트리 만들기 (백준 실버4)
# 문제 링크: https://www.acmicpc.net/problem/14244

from collections import deque

class Node:
    def __init__(self,value,next,prev):
        self.next = next
        self.prev = prev
        self.value = value


def node_connector(node_number,diff ):
    first_node = None
    present_node = None
    for i in range(node_number):
        new_node = Node(i,[],[])
        if present_node is None:
            present_node = new_node
            first_node = new_node
        else:
            if node_number - i < diff:
                present_node.next.append(new_node)
                new_node.prev.append(present_node)
            else:
                present_node.next.append(new_node)
                new_node.prev.append(present_node)
                present_node = new_node
    queue = deque([first_node])
    visited = []
    result = []
    while len(queue) > 0:
        q = queue.popleft()
        if q.value not in visited:
            visited.append(q.value)
            for node in q.next:
                    if node.value not in visited:
                        result.append((q.value,node.value))
                        queue.append(node)
    return result


asd = list(map(int,input().split()))
result = node_connector(asd[0],asd[1])
z = list(map(lambda x:" ".join(list(map(str,x))),result))
print("\n".join(z))