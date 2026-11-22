# Sprout Bot button box: Raspberry Pi Pico + CircuitPython.
# Each button: GPIO pin -> button -> GND (internal pull-up, pressed = False).
import time
import board
import digitalio
import usb_hid
from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keycode import Keycode

BUTTONS = [
    (board.GP2, Keycode.LEFT_ARROW),   # LEFT  (blue)
    (board.GP3, Keycode.SPACE),        # GO    (green)
    (board.GP4, Keycode.RIGHT_ARROW),  # RIGHT (orange)
    (board.GP6, Keycode.ONE),          # Answer 1
    (board.GP7, Keycode.TWO),          # Answer 2
    (board.GP8, Keycode.THREE),        # Answer 3
    (board.GP9, Keycode.FOUR),         # Answer 4
]

DEBOUNCE_S = 0.03

kbd = Keyboard(usb_hid.devices)
pins = []
for pin, key in BUTTONS:
    io = digitalio.DigitalInOut(pin)
    io.switch_to_input(pull=digitalio.Pull.UP)
    pins.append({"io": io, "key": key, "down": False, "changed": 0.0})

while True:
    now = time.monotonic()
    for p in pins:
        pressed = not p["io"].value
        if pressed != p["down"] and (now - p["changed"]) > DEBOUNCE_S:
            p["down"] = pressed
            p["changed"] = now
            # Send a quick tap on press only. Holding a button does NOT auto-repeat,
            # so a kid leaning on LEFT doesn't fling the robot across the field.
            if pressed:
                kbd.press(p["key"])
                kbd.release(p["key"])
    time.sleep(0.005)
