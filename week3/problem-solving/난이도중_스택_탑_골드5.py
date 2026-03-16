# 스택 - 탑 (백준 골드5)
# 문제 링크: https://www.acmicpc.net/problem/2493

input_number = int(input())
data_list = list(map(int,input().split()))

stack_height = []
stack_location = []
answer = []
for i in range(len(data_list)):
    if len(stack_height) == 0:
        stack_height.append(data_list[i])
        stack_location.append(i)
        answer.append(0)
    else:
        if stack_height[-1] > data_list[i]:
            answer.append(stack_location[-1]+1)
            stack_height.append(data_list[i])
            stack_location.append(i)
        elif stack_height[-1] <= data_list[i]:
            while True:
                if len(stack_height) == 0:
                    stack_height.append(data_list[i])
                    stack_location.append(i)
                    answer.append(0)
                    break
                elif stack_height[-1] <= data_list[i]:
                    stack_height.pop()
                    stack_location.pop()
                else:
                    answer.append(stack_location[-1]+1)
                    stack_height.append(data_list[i])
                    stack_location.append(i)
                    break

print(" ".join(list(map(str,answer))))