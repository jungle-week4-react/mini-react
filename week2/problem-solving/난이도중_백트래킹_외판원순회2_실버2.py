# 백트래킹 - 외판원 순회 2 (백준 실버2)
# 문제 링크: https://www.acmicpc.net/problem/10971
city_array = [list(map(int, input().split())) for i in range(int(input()))]


def main(city_cost):
    result = []
    min_value = [9999999999999]
    current_array = []
    departed_city = []

    def back_tracking(current_city):
        if len(current_array) == len(city_cost):
            if min_value[0] > sum(current_array):
                min_value[0] = sum(current_array)
            return
        for next_city in range(len(city_cost)):
            if current_city == next_city:
                continue
            elif next_city in departed_city:
                continue
            elif city_cost[current_city][next_city] == 0:
                continue
            elif next_city == 0 and len(current_array) < len(city_cost) - 1:
                continue
            elif next_city != 0 and len(current_array) == len(city_cost) - 1:
                continue
            else:
                current_array.append(city_cost[current_city][next_city])
                departed_city.append(next_city)
                back_tracking(next_city)
                current_array.pop()
                departed_city.pop()

    back_tracking(0)
    return min_value


print(main(city_array)[0])
