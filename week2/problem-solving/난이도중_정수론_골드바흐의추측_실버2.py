# 정수론 - 골드바흐의 추측 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/9020

"소수 찾는걸 응용해서 1부터"

import math

T = int(input())

n = [int(input()) for i in range(T)]

max_number = max(n)
prime_list = []


for i in range(max_number + 1):

    if i == 2:
        prime_list.append(2)
        continue
    elif i % 2 == 0:
        continue
    is_prime = True
    for j in range(3, int(math.sqrt(i)) + 1, 2):
        if i % j == 0:
            is_prime = False
            break
    if is_prime:
        prime_list.append(i)

for i in range(len(n)):
    for j in range(n[i] // 2, 1, -1):
        if j in prime_list:
            if (n[i] - j) in prime_list:
                print(f"{j} {n[i] - j}")
                break
