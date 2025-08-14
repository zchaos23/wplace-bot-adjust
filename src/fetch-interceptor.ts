// /* eslint-disable unicorn/prefer-global-this */
// export const maps = new Map<string, HTMLImageElement>()
// export function registerFetchInterceptor() {
//   const originalFetch = window.fetch
//   console.log('[register]', window.toString())
//   window.fetch = async (...arguments_) => {
//     const response = await originalFetch(...arguments_)
//     // const cloned = response.clone()
//     const url = (arguments_[0] as Request).url
//     if (url.startsWith('https://backend.wplace.live/files/s0/tiles/')) {
//       const [x, y] = 'https://backend.wplace.live/files/s0/tiles/1264/735.png'
//         .slice(43)
//         .split('/')
//         .map((x) => Number.parseInt(x)) as [number, number]
//     }
//     return response
//   }
//   console.log('[result]', window.fetch.toString())
// }
