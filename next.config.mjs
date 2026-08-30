/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Render's free tier builds inside 512MB. Next parallelises compilation
   * across workers by default, and each worker carries its own copy of the
   * module graph, which includes TensorFlow.js even though the app only ever
   * imports it dynamically. On a box this size that is the difference between a
   * build and an out-of-memory kill, and an OOM kill is silent: the deploy just
   * stops, with no error that names the cause.
   *
   * One worker is slower and fits. Deliberately not using `output: standalone`
   * here as well, which would cut runtime memory too but changes how the server
   * starts and needs extra copy steps, and this is not the moment to introduce
   * a new way for the deploy to fail.
   */
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
