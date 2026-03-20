# 스택 - 원 영역 (백준 플래4)
# 문제 링크: https://www.acmicpc.net/problem/10000

# 정렬

# 큰것 -> 작은것 원 끼워 넣기
# 영역을 길이로 표시

import sys

number_of_input = int(sys.stdin.readline().rstrip("\n"))
circle_info_list = []
for _ in range(number_of_input):
    circle_info = list(map(int,sys.stdin.readline().rstrip("\n").split()))
    circle_info_list.append(circle_info)
sorted(circle_info_list,reverse=True)





area_count = 1




def merge(arr,left,right):
    1