n = 10

array = []
for i in range(n):
    array.append([])
    for j in range(n):
        array[i].append(-1)

i = 1
j = 1
column = [-1] * n
diag1 = [-1] * 2 * n
diag2 = [-1] * 2 * n


for i in range(n):
    for j in range(n):
        print(i - j + n)
        print(i + j)
        diag1[i - j + n] = 1
        diag2[i + j] = 1

print(diag1)
print(diag2)
