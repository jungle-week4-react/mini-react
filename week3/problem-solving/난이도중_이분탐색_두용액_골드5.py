# 이분탐색 - 두 용액 (백준 골드5)
# 문제 링크: https://www.acmicpc.net/problem/2470

# divide max min


def merge(arr, left, mid, right):
    left_arr = arr[left : mid + 1]
    right_arr = arr[mid + 1 : right + 1]

    left_arr.append(9999999999999999999999)

    right_arr.append(9999999999999999999999)
    i = 0
    j = 0
    for k in range(left, right + 1):
        if left_arr[i] > right_arr[j]:
            arr[k] = right_arr[j]
            j += 1
        else:
            arr[k] = left_arr[i]
            i += 1


def merge_helper(arr, left, right):
    if left >= right:
        return
    mid = (left + right) // 2
    merge_helper(arr, left, mid)
    merge_helper(arr, mid + 1, right)
    merge(arr, left, mid, right)


def main(arr):
    if len(arr) > 1:
        merge_helper(arr, 0, len(arr) - 1)
        return arr
    else:
        return arr


# print(divide_max_min(asd, 0, len(asd) - 1))
import sys

number_of_input = sys.stdin.readline().rstrip("\n")
number_list = list(map(int, sys.stdin.readline().split()))

sorted_list = main(number_list)
left_cursor = 0
right_cursor = len(sorted_list) - 1
min_value = -1
target_list = [-1, left_cursor, right_cursor]
while True:
    before_abs_compare_value = sorted_list[left_cursor] + sorted_list[right_cursor]
    compare_value = abs(before_abs_compare_value)
    if right_cursor == left_cursor:
        break
    elif compare_value == 0:
        target_list = [0, left_cursor, right_cursor]
        break
    elif min_value != -1:
        if compare_value == min_value:
            if before_abs_compare_value <= 0:
                left_cursor += 1
            else:
                right_cursor -= 1
        elif compare_value < min_value:
            min_value = compare_value
            target_list = [compare_value, left_cursor, right_cursor]
            if before_abs_compare_value <= 0:
                left_cursor += 1
            else:
                right_cursor -= 1
        elif compare_value > min_value:
            if before_abs_compare_value <= 0:
                left_cursor += 1
            else:
                right_cursor -= 1
    else:
        min_value = compare_value
        target_list = [compare_value, left_cursor, right_cursor]
        if before_abs_compare_value <= 0:
            left_cursor += 1
        else:
            right_cursor -= 1


print(" ".join(list(map(lambda x: str(sorted_list[x]), target_list[1:]))))
