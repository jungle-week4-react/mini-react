# 완전탐색 - 차이를 최대로 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/10819

"재귀함수로 순열을 만들어서 array의 모든 조합을 구현한 후 해당하는 숫자를 넣어서 맞는지 틀린지 확인"

import copy

n = int(input())
n_array = list(map(int, input().split()))


def recursive(origin_array, max_number=-1):
    result = [max_number]
    current_array = []

    def p_recursive(array):
        global max_nubmer
        if len(current_array) == len(origin_array):
            sum_factor = sum_function(current_array)
            if result[0] < sum_factor:
                result[0] = sum_factor
            return
        elif len(array) == 0:
            return
        else:
            for i in range(len(array)):
                current_array.append(array[i])
                p_recursive(array[:i] + array[i + 1 :])
                current_array.pop()

    p_recursive(origin_array)
    return result


def sum_function(array):
    result = 0
    for i in range(len(array) - 1):
        result += abs(array[i] - array[i + 1])
    return result


print(recursive(n_array)[0])
