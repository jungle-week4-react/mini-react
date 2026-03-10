# 백트래킹 - N-Queen (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/9663

"""
y좌표 상태 리스트,대각선 상태 리스트를 만들어서 y좌표, 대각이 겹치는지 확인하고 좌표를 단순하게 row를 재귀함수에서 +1하면서 앞으로 가되 나머지 col은 for문으로 모두 scope
backtracking으로서 대각선 y좌표 상태를 확인하고 모두 맞고 내려간 개수가 같으면 count를 +=1 해서 리턴

"""

max_number = int(input())


def main(N):

    result = []
    ban_position = [-1] * N
    diag1 = [-1] * 2 * N
    diag2 = [-1] * 2 * N
    total_count = 0

    def dfs(row, total_count, select_count):
        if select_count == N:
            total_count += 1
            return total_count
        if row == N:
            return total_count
        for i in range(N):
            if (
                ban_position[i] == -1
                and diag1[row - i + N] != 1
                and diag2[row + i] != 1
            ):
                diag1[row - i + N] = 1
                diag2[row + i] = 1
                ban_position[i] = 1
                total_count = dfs(row + 1, total_count, select_count + 1)
                ban_position[i] = -1
                diag1[row - i + N] = -1
                diag2[row + i] = -1
        return total_count

    total_count = dfs(0, total_count, 0)
    return total_count


print(main(max_number))
