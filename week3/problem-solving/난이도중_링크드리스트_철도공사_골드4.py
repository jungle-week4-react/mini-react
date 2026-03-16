# 링크드리스트 - 철도 공사 (백준 골드4)
# 문제 링크: https://www.acmicpc.net/problem/23309

import sys

n, m = list(map(int, sys.stdin.readline().rstrip("\n").split()))
station_num_list = list(map(int,sys.stdin.readline().rstrip("\n").split()))


# class Node:
#     def __init__(self, station_num):
#         self.station_num = station_num
#         self.next = None
#         self.prev = None


class LinkedList:
    def __init__(self, arr: list[str]):
        self.linked_list_next = [0] * 1000001
        self.linked_list_prev = [0] * 1000001

        self.first_node = None
        cursor = None
        for i in range(len(arr)):
            data = arr[i]
            if i == 0:
                self.first_node = arr[i]
                cursor = arr[i]
            else:
                self.node_connect(cursor, arr[i])
                cursor = arr[i]
        if len(arr) != 0:
            self.node_connect(arr[i],self.first_node)

    def node_connect(self, prev_index, next_index):
        self.linked_list_next[prev_index] = next_index
        self.linked_list_prev[next_index] = prev_index

    def work_start(self, work):
        if work[0] == "BN":
            i, j = work[1:]
            next_node = self.linked_list_next[i]
            self.node_connect(i, j)
            self.node_connect(j, next_node)
            return str(next_node)
        if work[0] == "BP":
            i, j = work[1:]
            prev_node = self.linked_list_prev[i]
            self.node_connect(j, i)
            self.node_connect(prev_node, j)
            return str(prev_node)
        if work[0] == "CN":
            i = work[1]
            origin_prev = self.linked_list_next[i]
            self.node_connect(i,self.linked_list_next[self.linked_list_next[i]])
            return str(origin_prev)
        if work[0] == "CP":
            i = work[1]
            origin_next = self.linked_list_prev[i]
            self.node_connect(self.linked_list_prev[self.linked_list_prev[i]],i)
            return str(origin_next)


linked_list = LinkedList(station_num_list)

data_store = []

for _ in range(m):
    cmd, *rest = sys.stdin.readline().split()
    if cmd in ("BN", "BP"):
        appending_data = [cmd, int(rest[0]), int(rest[1])]
    else:
        appending_data = [cmd, int(rest[0])]

    data_store.append(linked_list.work_start(appending_data))

sys.stdout.write("\n".join(data_store))
