using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net;
using System.Text;
using System.Xml;

namespace MacPackager
{
    class Program
    {
        // 项目根目录动态解析，优先级：
        // 1) 命令行参数: MacPackager.exe <项目根目录>
        // 2) 从 exe 所在目录向上查找含 package.json 的目录（exe 默认在 <项目根>\scripts 下）
        // 3) 当前工作目录
        static string ProjectDir = ResolveProjectDir();

        static string ResolveProjectDir()
        {
            string[] argv = Environment.GetCommandLineArgs();
            if (argv.Length > 1 && !string.IsNullOrWhiteSpace(argv[1]) && Directory.Exists(argv[1]))
            {
                return Path.GetFullPath(argv[1]);
            }
            string dir = AppDomain.CurrentDomain.BaseDirectory;
            while (!string.IsNullOrEmpty(dir))
            {
                if (File.Exists(Path.Combine(dir, "package.json")))
                {
                    return dir;
                }
                DirectoryInfo parent = Directory.GetParent(dir);
                dir = parent == null ? null : parent.FullName;
            }
            return Directory.GetCurrentDirectory();
        }
        static string ElectronVersion = "19.1.9";
        static string AppName = "Niko直播";
        static string BundleId = "com.niko.live";
        static string Version = "6.5.0";
        static string TrtcSdkVersion = "13.4.802-beta.1";

        static string CacheDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "niko-mac-build");
        static string OutputDir { get { return Path.Combine(ProjectDir, "dist"); } }

        static int Main(string[] args)
        {
            try
            {
                Directory.CreateDirectory(CacheDir);
                Directory.CreateDirectory(OutputDir);
                Log("项目目录: " + ProjectDir);

                Log("步骤 1: 下载 Electron mac 二进制");
                string electronZip = DownloadElectronMac();

                Log("步骤 2: 解压 Electron.app 并解析符号链接");
                string workDir = @"C:\niko-mac\w" + DateTime.Now.ToString("HHmmss");
                Directory.CreateDirectory(workDir);
                ExtractZipWithSymlinks(electronZip, workDir);

                string electronApp = Path.Combine(workDir, "Electron.app");
                if (!Directory.Exists(electronApp))
                {
                    var found = Directory.GetDirectories(workDir, "*.app").FirstOrDefault();
                    if (found == null) throw new Exception("未找到 Electron.app");
                    electronApp = found;
                }

                Log("步骤 3: 下载 TRTC mac SDK");
                string trtcMacZip = DownloadTrtcMacSdk();

                Log("步骤 4: 组装 .app bundle");
                string appPath = Path.Combine(workDir, AppName + ".app");
                if (Directory.Exists(appPath)) Directory.Delete(appPath, true);
                Directory.Move(electronApp, appPath);

                string macOsDir = Path.Combine(appPath, "Contents", "MacOS");
                string oldExe = Path.Combine(macOsDir, "Electron");
                string newExe = Path.Combine(macOsDir, AppName);
                if (File.Exists(oldExe)) File.Move(oldExe, newExe);

                Log("步骤 5: 复制 TRTC mac framework 到 Frameworks");
                CopyTrtcFramework(trtcMacZip, appPath);

                Log("步骤 6: 复制应用文件到 Contents/Resources/app");
                CopyAppFiles(appPath);

                Log("步骤 7: 替换 trtc-electron-sdk 为 mac 原生模块");
                ReplaceTrtcNativeMac(appPath, trtcMacZip);

                Log("步骤 8: 生成 Info.plist");
                GenerateInfoPlist(appPath);

                Log("步骤 9: 打包为 zip");
                string outputZip = Path.Combine(OutputDir, AppName + "-" + Version + "-mac-x64.zip");
                if (File.Exists(outputZip)) File.Delete(outputZip);
                CreateAppZip(appPath, outputZip);

                Log("完成! 输出: " + outputZip);
                Log("大小: " + Math.Round(new FileInfo(outputZip).Length / 1024.0 / 1024.0, 1) + " MB");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("错误: " + ex.Message);
                Console.Error.WriteLine(ex.StackTrace);
                return 1;
            }
        }

        static void Log(string msg)
        {
            Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg);
        }

        static string DownloadElectronMac()
        {
            string zipPath = Path.Combine(CacheDir, "electron-v" + ElectronVersion + "-darwin-x64.zip");
            if (File.Exists(zipPath) && new FileInfo(zipPath).Length > 1024 * 1024)
            {
                Log("  已缓存: " + zipPath);
                return zipPath;
            }
            string url = "https://npmmirror.com/mirrors/electron/" + ElectronVersion + "/electron-v" + ElectronVersion + "-darwin-x64.zip";
            Log("  下载: " + url);
            using (var client = new WebClient())
            {
                client.Headers.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
                client.DownloadFile(url, zipPath);
            }
            return zipPath;
        }

        static string DownloadTrtcMacSdk()
        {
            string zipPath = Path.Combine(CacheDir, "trtc-electron-sdk-mac-" + TrtcSdkVersion + ".zip");
            if (File.Exists(zipPath) && new FileInfo(zipPath).Length > 1024 * 1024)
            {
                Log("  已缓存: " + zipPath);
                return zipPath;
            }
            string url = "https://web.sdk.qcloud.com/trtc/electron/download/trtc-electron-sdk/" + TrtcSdkVersion + "/trtc-electron-sdk-mac-" + TrtcSdkVersion + ".zip";
            Log("  下载: " + url);
            using (var client = new WebClient())
            {
                client.Headers.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
                client.DownloadFile(url, zipPath);
            }
            return zipPath;
        }

        static void ExtractZipWithSymlinks(string zipPath, string outputDir)
        {
            var symlinks = new List<KeyValuePair<string, string>>();

            using (var archive = ZipFile.OpenRead(zipPath))
            {
                foreach (var entry in archive.Entries)
                {
                    string destPath = Path.Combine(outputDir, entry.FullName.Replace('/', Path.DirectorySeparatorChar));

                    int mode = (int)((entry.ExternalAttributes >> 16) & 0xF000);
                    if (mode == 0xA000)
                    {
                        using (var reader = new StreamReader(entry.Open()))
                        {
                            string target = reader.ReadToEnd();
                            symlinks.Add(new KeyValuePair<string, string>(destPath, target));
                        }
                        continue;
                    }

                    if (entry.FullName.EndsWith("/"))
                    {
                        Directory.CreateDirectory(destPath);
                    }
                    else
                    {
                        string dir = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                        entry.ExtractToFile(destPath, true);
                    }
                }
            }

            foreach (var kv in symlinks)
            {
                ResolveSymlink(kv.Key, kv.Value);
            }
            // 重试一次
            foreach (var kv in symlinks)
            {
                if (File.Exists(kv.Key) || Directory.Exists(kv.Key)) continue;
                ResolveSymlink(kv.Key, kv.Value);
            }

            Log("  解压完成，处理了 " + symlinks.Count + " 个符号链接");
        }

        static void ResolveSymlink(string linkPath, string target)
        {
            try
            {
                string linkDir = Path.GetDirectoryName(linkPath);
                string resolved = Path.GetFullPath(Path.Combine(linkDir, target.Replace('/', Path.DirectorySeparatorChar)));

                if (File.Exists(resolved))
                {
                    string dir = Path.GetDirectoryName(linkPath);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    File.Copy(resolved, linkPath, true);
                }
                else if (Directory.Exists(resolved))
                {
                    CopyDirectory(resolved, linkPath);
                }
            }
            catch (Exception ex)
            {
                Log("  符号链接解析失败: " + Path.GetFileName(linkPath) + ": " + ex.Message);
            }
        }

        static void CopyDirectory(string src, string dst)
        {
            Directory.CreateDirectory(dst);
            var psi = new ProcessStartInfo
            {
                FileName = "robocopy",
                Arguments = "\"" + src + "\" \"" + dst + "\" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var p = Process.Start(psi))
            {
                p.WaitForExit();
            }
        }

        static void CopyTrtcFramework(string trtcMacZip, string appPath)
        {
            string frameworksDir = Path.Combine(appPath, "Contents", "Frameworks");
            Directory.CreateDirectory(frameworksDir);

            using (var archive = ZipFile.OpenRead(trtcMacZip))
            {
                foreach (var entry in archive.Entries)
                {
                    const string prefix = "build/mac-framework/x64/";
                    if (!entry.FullName.StartsWith(prefix)) continue;
                    string relative = entry.FullName.Substring(prefix.Length);
                    if (string.IsNullOrEmpty(relative)) continue;

                    string destPath = Path.Combine(frameworksDir, relative.Replace('/', Path.DirectorySeparatorChar));

                    int mode = (int)((entry.ExternalAttributes >> 16) & 0xF000);
                    if (mode == 0xA000) continue;

                    if (entry.FullName.EndsWith("/"))
                    {
                        Directory.CreateDirectory(destPath);
                    }
                    else
                    {
                        string dir = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                        entry.ExtractToFile(destPath, true);
                    }
                }
            }

            FixFrameworkSymlinks(frameworksDir);
            Log("  TRTC framework 已复制");
        }

        static void FixFrameworkSymlinks(string frameworksDir)
        {
            foreach (var fwDir in Directory.GetDirectories(frameworksDir, "*.framework"))
            {
                string versionsDir = Path.Combine(fwDir, "Versions");
                if (Directory.Exists(versionsDir))
                {
                    string current = Path.Combine(versionsDir, "Current");
                    string versionA = Path.Combine(versionsDir, "A");
                    if (Directory.Exists(versionA) && !Directory.Exists(current))
                    {
                        CopyDirectory(versionA, current);
                    }
                }

                string fwName = Path.GetFileNameWithoutExtension(fwDir);
                foreach (var name in new[] { "Resources", fwName, "Libraries", "Helpers", "Headers" })
                {
                    string linkPath = Path.Combine(fwDir, name);
                    string target = Path.Combine(fwDir, "Versions", "Current", name);
                    if ((File.Exists(target) || Directory.Exists(target)) && !File.Exists(linkPath) && !Directory.Exists(linkPath))
                    {
                        if (File.Exists(target)) File.Copy(target, linkPath, true);
                        else if (Directory.Exists(target)) CopyDirectory(target, linkPath);
                    }
                }
            }
        }

        static void CopyAppFiles(string appPath)
        {
            string appDir = Path.Combine(appPath, "Contents", "Resources", "app");
            Directory.CreateDirectory(appDir);

            foreach (var f in new[] { "package.json", "main.js", "TUILiveKit.main.js" })
            {
                string src = Path.Combine(ProjectDir, f);
                if (File.Exists(src)) File.Copy(src, Path.Combine(appDir, f), true);
            }

            string distSrc = Path.Combine(ProjectDir, "dist");
            if (Directory.Exists(distSrc))
            {
                string distDst = Path.Combine(appDir, "dist");
                Directory.CreateDirectory(distDst);
                // 复制 dist 但排除 electron-builder 构建产物
                var psi = new ProcessStartInfo
                {
                    FileName = "robocopy",
                    Arguments = "\"" + distSrc + "\" \"" + distDst + "\" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1" +
                                " /XD win-unpacked" +
                                " /XF *.exe *.zip *.blockmap builder-debug.yml",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    RedirectStandardOutput = true
                };
                using (var p = Process.Start(psi)) { p.WaitForExit(); }
            }

            foreach (var dir in new[] { "TUILiveKit", "niko", "src" })
            {
                string src = Path.Combine(ProjectDir, dir);
                if (Directory.Exists(src))
                {
                    CopyDirectory(src, Path.Combine(appDir, dir));
                }
            }

            string nmSrc = Path.Combine(ProjectDir, "node_modules");
            string nmDst = Path.Combine(appDir, "node_modules");
            if (Directory.Exists(nmSrc))
            {
                CopyNodeModules(nmSrc, nmDst);
            }

            Log("  应用文件已复制");
        }

        static void CopyNodeModules(string src, string dst)
        {
            Directory.CreateDirectory(dst);
            var excludeList = new List<string>();
            foreach (var entry in Directory.GetFileSystemEntries(src))
            {
                string name = Path.GetFileName(entry);
                if (name == ".bin" || name == ".cache" || name.StartsWith("."))
                {
                    excludeList.Add(name);
                }
                else if (IsDevDependency(name))
                {
                    excludeList.Add(name);
                }
            }

            string xdArgs = "";
            if (excludeList.Count > 0)
            {
                xdArgs = " /XD " + string.Join(" ", excludeList.Select(n => "\"" + n + "\"").ToArray());
            }

            var psi = new ProcessStartInfo
            {
                FileName = "robocopy",
                Arguments = "\"" + src + "\" \"" + dst + "\" /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1" + xdArgs,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var p = Process.Start(psi))
            {
                p.WaitForExit();
            }
            Log("  node_modules 复制完成 (排除 " + excludeList.Count + " 个开发依赖)");
        }

        static void TryDelete(string path)
        {
            try
            {
                if (File.Exists(path)) File.Delete(path);
                else if (Directory.Exists(path)) DeleteDirectoryLong(path);
            }
            catch { }
        }

        static void DeleteDirectoryLong(string path)
        {
            // 用 robocopy 清空再删除，避免长路径问题
            string empty = Path.Combine(Path.GetTempPath(), "empty_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(empty);
            var psi = new ProcessStartInfo
            {
                FileName = "robocopy",
                Arguments = "\"" + empty + "\" \"" + path + "\" /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true
            };
            using (var p = Process.Start(psi)) { p.WaitForExit(); }
            try { Directory.Delete(path, true); } catch { }
            try { Directory.Delete(empty, true); } catch { }
        }

        static bool IsDevDependency(string name)
        {
            string[] devPrefixes = {
                "@vue/cli", "@vue/eslint", "typescript", "webpack", "eslint",
                "babel", "@babel", "vue-loader", "css-loader", "sass-loader",
                "file-loader", "url-loader", "html-webpack-plugin", "terser",
                "mini-css-extract", "postcss", "autoprefixer", "sass",
                "node-sass", "vue-template-compiler", "fork-ts-checker",
                "case-sensitive-paths", "pnp-webpack-plugin", "thread-loader",
                "workbox", "@types/", "@typescript-eslint", "tslib",
                "electron-builder", "app-builder", "dmg-builder", "builder-util",
                "7zip-bin", "electron", "prettier", "electron-devtools-installer",
            };
            foreach (var p in devPrefixes)
            {
                if (name.StartsWith(p, StringComparison.OrdinalIgnoreCase)) return true;
            }
            return false;
        }

        static void ReplaceTrtcNativeMac(string appPath, string trtcMacZip)
        {
            string trtcDir = Path.Combine(appPath, "Contents", "Resources", "app", "node_modules", "trtc-electron-sdk");
            if (!Directory.Exists(trtcDir)) return;

            string buildDir = Path.Combine(trtcDir, "build");
            if (Directory.Exists(buildDir)) Directory.Delete(buildDir, true);
            Directory.CreateDirectory(buildDir);

            string releaseDir = Path.Combine(buildDir, "Release");
            Directory.CreateDirectory(releaseDir);

            using (var archive = ZipFile.OpenRead(trtcMacZip))
            {
                foreach (var entry in archive.Entries)
                {
                    if (entry.FullName == "build/Release/trtc_electron_sdk.node")
                    {
                        entry.ExtractToFile(Path.Combine(releaseDir, "trtc_electron_sdk.node"), true);
                        break;
                    }
                }
            }

            Log("  trtc-electron-sdk 已替换为 mac 原生模块");
        }

        static void GenerateInfoPlist(string appPath)
        {
            string plistPath = Path.Combine(appPath, "Contents", "Info.plist");

            var settings = new XmlWriterSettings
            {
                Indent = true,
                IndentChars = "  ",
                Encoding = new UTF8Encoding(false)
            };

            using (var writer = XmlWriter.Create(plistPath, settings))
            {
                writer.WriteStartDocument();
                writer.WriteDocType("plist", "-//Apple//DTD PLIST 1.0//EN", "http://www.apple.com/DTDs/PropertyList-1.0.dtd", null);
                writer.WriteStartElement("plist");
                writer.WriteAttributeString("version", "1.0");
                writer.WriteStartElement("dict");

                WritePlistKeyString(writer, "CFBundleName", AppName);
                WritePlistKeyString(writer, "CFBundleDisplayName", AppName);
                WritePlistKeyString(writer, "CFBundleIdentifier", BundleId);
                WritePlistKeyString(writer, "CFBundleVersion", Version);
                WritePlistKeyString(writer, "CFBundleShortVersionString", Version);
                WritePlistKeyString(writer, "CFBundleExecutable", AppName);
                WritePlistKeyString(writer, "CFBundlePackageType", "APPL");
                WritePlistKeyString(writer, "CFBundleIconFile", "electron.icns");
                WritePlistKeyString(writer, "LSMinimumSystemVersion", "10.13.0");
                WritePlistKeyBool(writer, "NSHighResolutionCapable", true);
                WritePlistKeyBool(writer, "LSUIElement", false);
                WritePlistKeyString(writer, "NSCameraUsageDescription", "Niko直播需要使用摄像头进行直播推流");
                WritePlistKeyString(writer, "NSMicrophoneUsageDescription", "Niko直播需要使用麦克风进行音频采集");
                WritePlistKeyString(writer, "NSScreenCaptureDescription", "Niko直播需要屏幕录制权限以进行屏幕共享");
                WritePlistKeyString(writer, "LSApplicationCategoryType", "public.app-category.social-networking");

                writer.WriteStartElement("key"); writer.WriteString("CFBundleURLTypes"); writer.WriteEndElement();
                writer.WriteStartElement("array");
                writer.WriteStartElement("dict");
                WritePlistKeyString(writer, "CFBundleURLName", BundleId);
                writer.WriteStartElement("key"); writer.WriteString("CFBundleURLSchemes"); writer.WriteEndElement();
                writer.WriteStartElement("array");
                writer.WriteElementString("string", "niko-live");
                writer.WriteEndElement();
                writer.WriteEndElement();
                writer.WriteEndElement();

                writer.WriteEndElement();
                writer.WriteEndElement();
                writer.WriteEndDocument();
            }

            Log("  Info.plist 已生成");
        }

        static void WritePlistKeyString(XmlWriter w, string key, string val)
        {
            w.WriteStartElement("key"); w.WriteString(key); w.WriteEndElement();
            w.WriteElementString("string", val);
        }

        static void WritePlistKeyBool(XmlWriter w, string key, bool val)
        {
            w.WriteStartElement("key"); w.WriteString(key); w.WriteEndElement();
            w.WriteElementString(val ? "true" : "false", "");
        }

        static void CreateAppZip(string appPath, string outputZip)
        {
            Log("  正在压缩 .app bundle...");
            if (File.Exists(outputZip)) File.Delete(outputZip);

            // 用 7za 打包，避免长路径问题
            string sevenZip = Path.Combine(ProjectDir, @"node_modules\builder-util\node_modules\7zip-bin\win\x64\7za-real.exe");
            if (!File.Exists(sevenZip))
            {
                sevenZip = Path.Combine(ProjectDir, @"node_modules\7zip-bin\win\x64\7za-real.exe");
            }

            var psi = new ProcessStartInfo
            {
                FileName = sevenZip,
                Arguments = "a -tzip \"" + outputZip + "\" \"" + appPath + "\\*\" -mx5 -bb0 -bsp0",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };
            using (var p = Process.Start(psi))
            {
                string output = p.StandardOutput.ReadToEnd();
                p.WaitForExit();
                if (p.ExitCode > 1)
                {
                    throw new Exception("7za 打包失败: " + output);
                }
            }
        }
    }
}
