# 해시 테이블 - 세 수의 합 (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/2295

import sys

input_number = int(sys.stdin.readline().rstrip("\n"))
data = [int(sys.stdin.readline().rstrip("\n")) for _ in range(input_number)]


def merge(arr, low, mid, high):
    left_arr = arr[low : mid + 1]
    right_arr = arr[mid + 1 : high + 1]

    left_arr.append(99999999999999999999)
    right_arr.append(99999999999999999999)
    i = 0
    j = 0
    for k in range(low, high + 1):
        if left_arr[i] > right_arr[j]:
            arr[k] = right_arr[j]
            j += 1
        else:
            arr[k] = left_arr[i]
            i += 1


def merge_helper(arr, low, high):
    if low >= high:
        return
    mid = (low + high) // 2
    merge_helper(arr, low, mid)
    merge_helper(arr, mid + 1, high)
    merge(arr, low, mid, high)


def merge_main(arr):
    if len(arr) > 1:
        merge_helper(arr, 0, len(arr) - 1)
    return arr


data = merge_main(data)

plus_data = {}
minus_data = {}

for i in range(len(data)):
    for j in range(len(data)):
        plus_data[data[i] + data[j]] = [data[i], data[j]]
        minus_data[data[i] - data[j]] = [data[i], data[j]]

max_number = -1
for i in plus_data:
    if i in minus_data:
        a, b = plus_data[i]
        d, c = minus_data[i]
        if max_number <= d:
            max_number = d
print(max_number)
