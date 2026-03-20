# 그래프, DFS, BFS - 점프왕 쩰리 (백준 실버4)
# 문제 링크: https://www.acmicpc.net/problem/16173
# 점프 = 두칸이동

sector_shape = int(input())
sector = []
for _ in range(sector_shape):
    sector.append(list(map(int,input().split())))

success = "HaruHaru"
fail = "Hing"


def main(arr):

    status = ["Hing"]

    def recursive(arr, row, col):
        if row > len(arr)-1 or col > len(arr)-1:
            return False
        elif row == len(arr)-1 and col == len(arr)-1:
            status[0] = "HaruHaru"
            return True
        jump_power = arr[col][row]
        if jump_power == 0:
            return False
        for array in [[row, col + jump_power], [row + jump_power, col]]:
            i, j = array
            recursive(arr,i,j)
            
    recursive(arr,0,0)
    return status[0]


print(main(sector))