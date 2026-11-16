using System.ComponentModel;
using System.Runtime.InteropServices;

internal static class NativeProcessLimits {
    // Linux x64/arm64 rlim_t is unsigned long. Unsupported OSes never execute
    // native scripts through the supervisor.
    [StructLayout(LayoutKind.Sequential)]
    private struct Limit { public ulong Current; public ulong Maximum; }
    [DllImport("libc", SetLastError=true)]
    private static extern int setrlimit(int resource, in Limit limit);

    public static void RestrictFiles() {
        if(!OperatingSystem.IsLinux() || !Environment.Is64BitProcess)
            throw new PlatformNotSupportedException("Linux 64-bit OS isolation required.");
        var limit = new Limit { Current=16*1024*1024, Maximum=16*1024*1024 };
        if(setrlimit(1, in limit)!=0) // RLIMIT_FSIZE, hard ceiling cannot be raised by user code.
            throw new Win32Exception(Marshal.GetLastWin32Error(),"Cannot enforce native file limit.");
    }
}
