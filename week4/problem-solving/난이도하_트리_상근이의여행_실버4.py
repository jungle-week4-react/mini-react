# 트리 - 상근이의 여행 (백준 실버4)
# 문제 링크: https://www.acmicpc.net/problem/9372

from collections import deque

test_number = int(input())
for _ in range(test_number):
    country, plane = list(map(int,input().split()))
    plane_node = []
    graph = {}
    for i in range(plane):
        plane_root = list(map(int,input().split()))
        plane_node.append(plane_root)
        if plane_root[0] not in graph:
            graph[plane_root[0]] = []
        if plane_root[1] not in graph:
            graph[plane_root[1]] = []
        graph[plane_root[0]].append(plane_root[1])
        graph[plane_root[1]].append(plane_root[0])
    
    start = list(graph.keys())[0]
    visited = []
    queue = deque([start])
    max_plane_number = [100000]
    depth = [0]
    def recursive(graph, q):
        if len(list(set(visited))) == country and max_plane_number[0] >= depth[0]:
            max_plane_number[0] = depth[0]
            return
        for i in graph[q]:
            if i not in visited:
                depth[0] += 1
                visited.append(i)
                recursive(graph, i)
                depth[0] -= 1
                visited.pop()
    recursive(graph,queue[0])
    print(max_plane_number[0]-1)