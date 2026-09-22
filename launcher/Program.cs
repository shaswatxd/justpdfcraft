using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Diagnostics;

namespace SwiftPDFLauncher
{
    static class Program
    {
        private static HttpListener listener;
        private static string distFolder;
        private static bool isRunning = true;

        [STAThread]
        static void Main(string[] args)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            distFolder = Path.Combine(baseDir, "dist");

            if (!Directory.Exists(distFolder))
            {
                // Fallback check in parent or current working directory
                string curDir = Directory.GetCurrentDirectory();
                string altDist = Path.Combine(curDir, "dist");
                if (Directory.Exists(altDist))
                {
                    distFolder = altDist;
                }
            }

            int port = 1420;
            listener = new HttpListener();
            string prefix = string.Format("http://127.0.0.1:{0}/", port);
            
            try
            {
                listener.Prefixes.Add(prefix);
                listener.Start();
            }
            catch
            {
                // Try alternate port if 1420 is busy
                port = 1428;
                prefix = string.Format("http://127.0.0.1:{0}/", port);
                listener = new HttpListener();
                listener.Prefixes.Add(prefix);
                listener.Start();
            }

            // Start HTTP listener background worker
            Thread serverThread = new Thread(ListenLoop);
            serverThread.IsBackground = true;
            serverThread.Start();

            // Locate browser for native App Mode
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
            }
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            }
            if (!File.Exists(edgePath))
            {
                edgePath = @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe";
            }

            string userDataDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SwiftPDF", "UserData"
            );

            try
            {
                Directory.CreateDirectory(userDataDir);
            }
            catch { }

            ProcessStartInfo psi = new ProcessStartInfo();
            if (File.Exists(edgePath))
            {
                psi.FileName = edgePath;
                psi.Arguments = string.Format(
                    "--app=\"{0}\" --window-size=1280,820 --app-id=SwiftPDF --user-data-dir=\"{1}\"",
                    prefix, userDataDir
                );
            }
            else
            {
                // Fallback to default browser
                psi.FileName = prefix;
                psi.UseShellExecute = true;
            }

            try
            {
                using (Process proc = Process.Start(psi))
                {
                    if (proc != null)
                    {
                        proc.WaitForExit();
                    }
                }
            }
            catch (Exception ex)
            {
                // Fallback open default browser
                Process.Start(prefix);
            }

            isRunning = false;
            try
            {
                listener.Stop();
            }
            catch { }
        }

        private static void ListenLoop()
        {
            while (isRunning && listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath;
                if (string.IsNullOrEmpty(rawUrl) || rawUrl == "/")
                {
                    rawUrl = "/index.html";
                }

                // Security check: disallow directory traversal
                if (rawUrl.Contains(".."))
                {
                    context.Response.StatusCode = 403;
                    context.Response.Close();
                    return;
                }

                string relativePath = rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(distFolder, relativePath);

                if (!File.Exists(filePath))
                {
                    // SPA fallback to index.html
                    filePath = Path.Combine(distFolder, "index.html");
                }

                if (File.Exists(filePath))
                {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    context.Response.ContentType = GetMimeType(filePath);
                    context.Response.ContentLength64 = bytes.Length;
                    context.Response.AddHeader("Cache-Control", "no-cache");
                    context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                    context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch
            {
                context.Response.StatusCode = 500;
            }
            finally
            {
                try
                {
                    context.Response.OutputStream.Close();
                }
                catch { }
            }
        }

        private static string GetMimeType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            switch (ext)
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js":
                case ".mjs": return "application/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                case ".jpg":
                case ".jpeg": return "image/jpeg";
                case ".ico": return "image/x-icon";
                case ".json": return "application/json";
                case ".pdf": return "application/pdf";
                case ".wasm": return "application/wasm";
                case ".woff": return "font/woff";
                case ".woff2": return "font/woff2";
                case ".ttf": return "font/ttf";
                default: return "application/octet-stream";
            }
        }
    }
}
