# 트리 - 이진 검색 트리 (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/5639

# *

# class Node:
#     def __init__(self, value, next, prev):
#         self.value = value
#         self.next = next
#         self.prev = prev
#         self.parent = None

#     def next_connect(self, next_node):
#         self.next.append(next_node)
#         next_node.parent = self

#     def prev_connect(self, prev_node):
#         self.prev.append(prev_node)
#         prev_node.parent = self

# def binary_back_seach(present_node):
#     if present_node.prev:
#         binary_back_seach(present_node.prev[0])

#     if present_node.next:
#         binary_back_seach(present_node.next[0])

#     return print(present_node.value)

# def binary_maker(present_node, node):
#     if present_node.value >= node.value:
#         if present_node.prev:
#             binary_maker(present_node.prev[0],node)
#         else:
#             present_node.prev_connect(node)
#     else:
#         if present_node.next:
#             binary_maker(present_node.next[0],node)
#         else:
#             present_node.next_connect(node)

# def main(arr):
#     for i in range(len(arr)):
#         new_node = Node(arr[i], [], [])
#         if i == 0:
#             first_node = new_node
#         else:
#             binary_maker(first_node,new_node)
#     first_node.length = i + 1
#     return first_node


import sys


def postorder(start, end):
    # 구간이 비면 종료
    if start == end:
        print(arr[start])
        return
    if start > end:
        return

    # start 위치 값을 루트로 잡기
    root = arr[start]

    # 루트보다 큰 값이 처음 나오는 위치 찾기
    bigger_index = end+1
    for i in range(start+1, end + 1):
        if root < arr[i]:
            bigger_index = i
            break

    # 왼쪽 구간 재귀
    postorder(start+1, bigger_index-1)
    # 오른쪽 구간 재귀
    postorder(bigger_index, end)

    # 루트 출력
    print(root)                                                      


arr = []
for line in sys.stdin:
    arr.append(int(line.rstrip()))

# arr = [50, 30, 24, 5, 28, 45, 98, 52, 60]
sys.setrecursionlimit(10**6)
postorder(0, len(arr) - 1)
