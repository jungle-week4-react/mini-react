# 이분탐색 - 두 용액 (백준 골드5)
# 문제 링크: https://www.acmicpc.net/problem/2470

# divide max min


def divide_max_min(arr, left, right):
    if left == right:
        return arr[left]

    mid = (left + right) // 2

    left_max = divide_max_min(arr, left, mid)
    right_max = divide_max_min(arr, mid + 1, right)

    if left_max > right_max:
        return left_max
    else:
        return right_max


# print(divide_max_min(asd, 0, len(asd) - 1))
