export async function checkSeries(series: number[]): Promise<void> {
  try {
    series.forEach((x, index) => {
      if (x !== index + 1) {
        throw new Error(`expected ${index + 1} but received ${x}`)
      }
    })
  } catch (e) {
    return Promise.reject(e)
  }
  return Promise.resolve()
}
