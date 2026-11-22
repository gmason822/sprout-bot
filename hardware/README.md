# Sprout Bot Button Box

A Raspberry Pi Pico running CircuitPython that shows up as a USB keyboard. The game reads it like normal keyboard input, so no drivers are needed. It works on a PC, Mac, Linux, and USB-C iPad or Android tablets (with a USB-C to micro-USB cable or adapter).

## Parts
- Raspberry Pi Pico (or Pico W)
- 7 × 30 mm arcade buttons: blue (LEFT), orange (RIGHT), green (GO), plus 4 answer buttons (red, yellow, purple, white)
- Wire, quick-connect terminals
- 3D-printed enclosure. Keep LEFT physically on the left and RIGHT on the right, with GO in the middle and bigger if you can. Put the answer buttons in a row above them.

## What the buttons do in the game
- **LEFT / RIGHT** move a highlight across the things he can pick.
- **GO** taps the highlighted thing. The green send button on screen is part of the highlight order.
- **Answer 1–4** tap that choice directly, counted from the left.

## Wiring
Each button has one leg to a GPIO pin and the other leg to **GND**. The firmware uses internal pull-ups, so no resistors are needed.

| Button | Pin | Key sent |
|--------|-----|----------|
| LEFT (blue)    | GP2  | Left Arrow |
| GO (green)     | GP3  | Space |
| RIGHT (orange) | GP4  | Right Arrow |
| Answer 1       | GP6  | 1 |
| Answer 2       | GP7  | 2 |
| Answer 3       | GP8  | 3 |
| Answer 4       | GP9  | 4 |

## Setup
1. Install CircuitPython on the Pico (hold BOOTSEL, plug in, then drag the `.uf2` from circuitpython.org onto the drive).
2. Copy the `adafruit_hid` folder from the CircuitPython library bundle into `CIRCUITPY/lib/`.
3. Copy `code.py` onto the `CIRCUITPY` drive.
4. Open a text editor and press each button. You should see arrows, spaces and 1–4.
