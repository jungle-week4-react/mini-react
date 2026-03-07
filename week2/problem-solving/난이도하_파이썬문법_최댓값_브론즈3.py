# 파이썬 문법 - 최댓값 (백준 브론즈3)
# 문제 링크: https://www.acmicpc.net/problem/2562


# ※※※※※※※※※※※중요※※※※※※※※※※※※※※※※※ 인풋 넣는 부분
problem_array = []
for i in range(9):
    problem_array.append(int(input()))

# 최대값 구하는 문제, 구상은 최소값과 최대값을 존재하지 않는 자연수로 정해두고 for루프를 써서 처음부터 끝까지 스코프를 한 다음
# max_number보다 크면 max_number에 해당하는 배열의 값을 넣고 max_index에 해당하는 인덱스를 넣는다 그리고 나머지도
# 돌려서 또 크면 같은 방식으로 넣는다

max_number = -1
max_index = -1
for i in range(len(problem_array)):
    if max_number < problem_array[i]:
        max_number = problem_array[i]
        max_index = i + 1

# ※※※※※※※※※※※중요※※※※※※※※※※※※※※※※※ 아웃풋 나오는 부분
print(f"{max_number}\n{max_index}\n")
