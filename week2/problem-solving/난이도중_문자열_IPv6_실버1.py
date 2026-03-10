# 문자열 - IPv6 (백준 실버1)
# 문제 링크: https://www.acmicpc.net/problem/3107

"""
중간에 값 넣는 것

"""

input_text = input()


def function(input_text):
    result = ""
    split_text = input_text.split(":")
    for i in range(len(split_text)):
        if i != len(split_text) - 1:
            result = result + ("000000" + split_text[i])[-4:] + ":"
        else:
            result = result + ("000000" + split_text[i])[-4:]
    return [result, len(split_text)]


if len(input_text.split("::")) > 1:
    count = 0
    blank_index = -1
    split_double_text = input_text.split("::")
    for i in range(len(split_double_text)):
        if split_double_text[i] != "":
            split_double_text[i], temp_count = function(split_double_text[i])
            count += temp_count
        else:
            blank_index = i
    if blank_index == -1:
        split_double_text.insert(1, ":".join(["0000" for i in range(8 - count)]))
    else:
        split_double_text[blank_index] = ":".join(["0000" for i in range(8 - count)])
    result = ":".join(split_double_text)

else:
    result = function(input_text)[0]
print(result)
