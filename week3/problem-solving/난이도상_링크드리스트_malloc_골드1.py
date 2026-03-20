# 링크드리스트 - malloc (백준 골드1)
# 문제 링크: https://www.acmicpc.net/problem/3217



# var=malloc(size);
# 이 함수은 처음 등장하는 size개의 연속된 공간을 찾아, 할당해주는 함수이다. 이 함수의 리턴값은 할당된 공간의 제일 처음 주소이다. 만약, 할당해줄 수 있는 공간이 없다면 0을 리턴한다. (100 ≤ size ≤ 100,000)
# free(var);
# 이 함수는 이전에 malloc을 통해 var에 할당된 공간을 할당 해제시켜주고, var에 0을 저장하는 함수이다. 만약, var가 이미 0이라면, 아무 일도 일어나지 않는다.
# print(var);
# var에 저장된 값을 출력하는 함수이다.
total_space = []
space = []
name = []

def malloc(size):
    space.append(size)