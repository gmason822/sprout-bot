# Credits

## Art
- Truck, robot, hen, apple and basket in `public/assets/art/`: drawn for this project (no third-party source).
- _Add Kenney packs here as you use them_, for example "Kenney — Farm Pack (CC0), https://kenney.nl"
- OpenMoji, the open-source emoji and icon project. License: CC BY-SA 4.0. https://openmoji.org

## Sound
- Sound effects are synthesized in `src/systems/sfx.js` (no files).
- Animal noises in `public/assets/audio/animals/` are cut from recordings on Wikimedia Commons. Each was trimmed to one short noise, made mono, evened out in loudness and converted to MP3 by `tools/sounds/make.py`. The clips made from CC BY-SA recordings are shared under the same licence as their source.

| Clip | Source recording | Author | Licence |
|------|------------------|--------|---------|
| `moo.mp3` | [Mudchute cow 1.ogg](https://commons.wikimedia.org/wiki/File:Mudchute_cow_1.ogg) | Secretlondon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `oink.mp3` | [Mudchute pig 1.ogg](https://commons.wikimedia.org/wiki/File:Mudchute_pig_1.ogg) and [Mudchute pig 2.ogg](https://commons.wikimedia.org/wiki/File:Mudchute_pig_2.ogg), joined | Secretlondon | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `woof.mp3` | [Barking of a dog.ogg](https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg), two barks joined | Amada44 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| `cluck.mp3` | [Hen announcing shes lain an egg.ogg](https://commons.wikimedia.org/wiki/File:Hen_announcing_shes_lain_an_egg.ogg) | alys | Public domain |
| `neigh.mp3` | [Wiehern.ogg](https://commons.wikimedia.org/wiki/File:Wiehern.ogg) | Hü. | Public domain |
| `meow.mp3` | [Meow of a Siamese cat - freemaster2.wav](https://commons.wikimedia.org/wiki/File:Meow_of_a_Siamese_cat_-_freemaster2.wav) | freemaster2 | CC0 |

## Voice
- Generated with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache 2.0), voice "af_heart", run locally through [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) (MIT).
