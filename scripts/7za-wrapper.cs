using System;
using System.Diagnostics;
using System.IO;
using System.Linq;

class Program
{
    static int Main(string[] args)
    {
        string exeDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
        string real7za = Path.Combine(exeDir, "7za-real.exe");

        string argStr = string.Join(" ", args.Select(a => a.Contains(" ") ? "\"" + a + "\"" : a));

        var psi = new ProcessStartInfo
        {
            FileName = real7za,
            Arguments = argStr,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        var p = Process.Start(psi);
        string stdout = p.StandardOutput.ReadToEnd();
        string stderr = p.StandardError.ReadToEnd();
        p.WaitForExit();

        Console.Write(stdout);
        Console.Error.Write(stderr);

        int exitCode = p.ExitCode;

        if (args.Contains("x") || args.Contains("e"))
        {
            string outDir = null;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].StartsWith("-o") && args[i].Length > 2)
                {
                    outDir = args[i].Substring(2);
                    break;
                }
            }
            if (!string.IsNullOrEmpty(outDir) && Directory.Exists(outDir))
            {
                FixDylibSymlinks(outDir);
            }
        }

        if (exitCode != 0 && (stderr.IndexOf("symbolic link", StringComparison.OrdinalIgnoreCase) >= 0 ||
                              stdout.IndexOf("symbolic link", StringComparison.OrdinalIgnoreCase) >= 0))
        {
            return 0;
        }

        return exitCode;
    }

    static void FixDylibSymlinks(string dir)
    {
        try
        {
            foreach (var file in Directory.GetFiles(dir, "*.dylib", SearchOption.AllDirectories))
            {
                var fi = new FileInfo(file);
                if (fi.Length == 0)
                {
                    string baseName = Path.GetFileNameWithoutExtension(file);
                    string dir2 = Path.GetDirectoryName(file);
                    string realFile = Path.Combine(dir2, baseName + ".1.0.0.dylib");
                    if (File.Exists(realFile))
                    {
                        File.Copy(realFile, file, true);
                    }
                }
            }
        }
        catch { }
    }
}
