# Lucky Panda

Wake the five patches of Wildbloom Woods and befriend three animals in a 3D browser adventure. Follow the golden lights to your next goal. There’s no timer.

## Play

Open `dist/index.html` in a browser with WebGL 2. The built HTML includes the game and its fonts and runs offline.

For local development, use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | On-screen arrows |
| Plant or hop | Space | Plant / hop |
| High jump with Pip | Tap Space twice while moving | Tap Plant / hop twice while moving |
| Clear logs with Bramble | Walk up to the logs | Walk up to the logs |
| Toss with Skye | Press E near the river, then click the island or press Enter | Tap Aim near the river, then tap the island |

Walk onto a grey patch or press Space near it to grow grass and flowers. Walk up to an animal to befriend it and unlock its ability.

Run `npm test` for the rules tests and `npm run build` to regenerate the offline HTML.
