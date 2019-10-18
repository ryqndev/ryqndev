
import random

for i in range(21):
    print(f'{str(i*5)}% {{ clip: rect({random.randrange(120)}px, 9999px, {random.randrange(120)}px, 0); }}')