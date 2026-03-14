# 큐 - 뱀 (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/3190
# *
import sys
from collections import deque

data_length = int(sys.stdin.readline().rstrip("\n"))

data_array = [([False] * data_length) for _ in range(data_length)]

apple_count = int(sys.stdin.readline().rstrip("\n"))
apple_location = []
for _ in range(apple_count):
    apple = list(map(lambda x: int(x) - 1, sys.stdin.readline().rstrip("\n").split()))
    apple_location.append(apple)
    data_array[apple[1]][apple[0]] = True

command_count = int(sys.stdin.readline().rstrip("\n"))
command_list = []
for _ in range(command_count):
    time_command = sys.stdin.readline().rstrip("\n").split()
    time_command[0] = int(time_command[0])
    command_list.append(time_command)


def dead_condition(n, location, snake_head_location):
    # is_dead = location[0] < 0 or location[1] < 0 or location[0] >= n or location[1] >= n
    is_dead = False
    if location[0] == snake_head_location[0] and location[1] == snake_head_location[1]:
        is_dead = True

    return is_dead


snake = deque([[0, 0]])
direction_list = [[0, 1], [1, 0], [0, -1], [-1, 0]]
direction = 0
game_status = True
is_append = False
seconds = 0
while game_status:
    seconds += 1
    x_move, y_move = direction_list[direction]

    # move 수정
    snake_head_location = snake.popleft()

    # 추가
    if len(snake) == 0:
        tail = snake_head_location[:]
    else:
        tail = snake[-1][:]
    if is_append:
        if len(snake) == 0:
            hallow_x, hallow_y = snake_head_location
        else:
            hallow_x, hallow_y = snake[-1]
        snake.append([hallow_x, hallow_y])
        is_append = False
    hallow_x, hallow_y = snake_head_location
    if len(snake) > 0:
        snake.appendleft([hallow_x, hallow_y])
        snake.pop()
    snake.append(tail)
    # 추가 완료
    snake_head_location[0] += x_move
    snake_head_location[1] += y_move
    # dead
    if (
        snake_head_location[0] < 0
        or snake_head_location[1] < 0
        or snake_head_location[0] >= data_length
        or snake_head_location[1] >= data_length
    ):
        print(seconds)
        game_status = False
        break
    is_break = False
    for i in range(len(snake)):
        # 입력3 문제
        if dead_condition(data_length, snake[i], snake_head_location):
            print(seconds)
            game_status = False
            is_break = True
            break
    if is_break:
        break

    if data_array[snake_head_location[1]][snake_head_location[0]]:
        data_array[snake_head_location[1]][snake_head_location[0]] = False
        is_append = True
    # command
    if len(command_list) > 0:
        if command_list[0][0] == seconds:
            if command_list[0][1] == "L":
                direction = 3 if direction <= 0 else direction - 1
            elif command_list[0][1] == "D":
                direction = 0 if direction >= 3 else direction + 1
            command_list.pop(0)
    # list_appending
    snake.pop()
    snake.appendleft(snake_head_location)


# 스네이크 머리제외 로직 점검 필요
