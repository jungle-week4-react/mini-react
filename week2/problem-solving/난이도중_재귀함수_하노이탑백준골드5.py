# 재귀함수 - 하노이 탑 (백준 골드5)
# 문제 링크: https://www.acmicpc.net/problem/1914

"""
하노이 n번째의 옮기는 상황을 가정하면
n-1개의 위에 있는 것들을 1번에서 2번으로 옮기고
n을 1번에서 3번으로 옮긴 다음
n-1개의 위에 있는 것들을 2에서 3으로 옮기면 완료
또한 첫번째 것은 1번에서 3번으로 옮기는게 첫번째다

이 과정을 재귀함수로 나타낸 것이다.
"""


top_height = int(input())


def hanoi_number(n):
    if n == 1:
        return 1
    else:
        return 2 * hanoi_number(n - 1) + 1


def hanoi(n, source, target, auxiliary):
    if n > 20:
        return

    if n == 1:
        print(f"{source} {target}")
    else:
        hanoi(n - 1, source, auxiliary, target)
        print(f"{source} {target}")
        hanoi(n - 1, auxiliary, target, source)


hanoi_number(top_height)
hanoi(top_height, 1, 3, 2)
