# 큐 - 가운데를 말해요 (백준 골드2)
# 문제 링크: https://www.acmicpc.net/problem/1655
import heapq
import sys

input_number = int(sys.stdin.readline().rstrip("\n"))
middle_value = -1
min_heap_q = []
max_heap_q = []

answer_list = []
for _ in range(input_number):
    data = int(sys.stdin.readline().rstrip("\n"))
    if len(min_heap_q) == 0:
        heapq.heappush(min_heap_q,-data)
        middle_value = -min_heap_q[0]
    else:
        if len(min_heap_q) <= len(max_heap_q):
            heapq.heappush(min_heap_q, -data)
        else:
            heapq.heappush(max_heap_q, data)
    if len(min_heap_q) > 0 and len(max_heap_q) > 0 and max_heap_q[0] < -min_heap_q[0]:
        change_max = heapq.heappop(max_heap_q)
        change_min = -heapq.heappop(min_heap_q)
        heapq.heappush(max_heap_q,change_min)
        heapq.heappush(min_heap_q,-change_max)
    middle_value = -min_heap_q[0]
    answer_list.append(middle_value)

print("\n".join(list(map(str, answer_list))))


# from collections import deque
# import sys
# import math

# def binary_search(arr, left, right, target):
#     if arr[right] < target:
#         return [arr[right], right, 3]
#     elif arr[left] > target:
#         return [arr[left], left, 2]
#     while left <= right:
#         mid = (left + right) // 2
#         if arr[mid] == target:
#             return [arr[mid], mid, 1]
#         elif (right - left <= 1):
#             return [arr[left], left, 0]
#         elif arr[mid] < target:
#             left = mid
#         else:
#             right = mid

# answer_list = []
# for _ in range(input_number):
#     data = int(input())
#     if len(input_list) == 0:
#         input_list.append(data)
#         middle_index = 0
#         answer_list.append(data)
#     else:
#         insert_data = binary_search(input_list,0,len(input_list)-1,data)
#         if insert_data[-1] == 3:
#             input_list.append(data)
#         elif insert_data[-1] == 2:
#             input_list.insert(0,data)
#         elif insert_data[-1] == 1 or insert_data[-1] == 0:
#             input_list.insert(insert_data[1]+1,data)
#         if len(input_list) % 2 == 0:
#             mid = (len(input_list))//2 -1
#             answer_list.append(input_list[mid])
#         else:
#             mid = (len(input_list))//2
#             answer_list.append(input_list[mid])
# print("\n".join(list(map(str,answer_list))))
