# 분할정복 - 색종이 만들기 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/2630
# *
import sys


def divide_conque_paper(arr, left, right, top, bottom):
    if left == right and top == bottom:
        paper_status = [0, 0, arr[left][top], 1]
        paper_status[arr[left][top]] += 1
        return paper_status

    mid_x = (left + right) // 2
    mid_y = (top + bottom) // 2
    one_sector = divide_conque_paper(arr, left, mid_x, top, mid_y)
    two_sector = divide_conque_paper(arr, left, mid_x, mid_y + 1, bottom)
    three_sector = divide_conque_paper(arr, mid_x + 1, right, top, mid_y)
    four_sector = divide_conque_paper(arr, mid_x + 1, right, mid_y + 1, bottom)

    if (
        one_sector[-1] != -1
        and two_sector[-1] == one_sector[-1]
        and three_sector[-1] == one_sector[-1]
        and four_sector[-1] == one_sector[-1]
        and two_sector[-2] == one_sector[-2]
        and three_sector[-2] == one_sector[-2]
        and four_sector[-2] == one_sector[-2]
    ):
        one_sector[-1] = right - left + 1
        return one_sector
    else:
        return [
            one_sector[0] + two_sector[0] + three_sector[0] + four_sector[0],
            one_sector[1] + two_sector[1] + three_sector[1] + four_sector[1],
            -1,
            -1,
        ]


number_of_input = int(sys.stdin.readline().rstrip("\n"))

input_list = []
for i in range(number_of_input):
    input_list.append(list(map(int, sys.stdin.readline().rstrip("\n").split())))


n = len(input_list) - 1

result = divide_conque_paper(input_list, 0, n, 0, n)
for i in result[:2]:
    print(i)
