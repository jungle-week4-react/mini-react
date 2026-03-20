# 트리 - 상근이의 여행 (백준 실버4)
# 문제 링크: https://www.acmicpc.net/problem/9372

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
    
    1