param([switch]$Release)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class PokeFileUsage {
  [StructLayout(LayoutKind.Sequential)] public struct ProcessKey { public int Id; public System.Runtime.InteropServices.ComTypes.FILETIME Started; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct ProcessInfo {
    public ProcessKey Process;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=256)] public string Name;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst=64)] public string Service;
    public int Type; public uint Status; public uint Session;
    [MarshalAs(UnmanagedType.Bool)] public bool Restartable;
  }
  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)] static extern int RmStartSession(out uint handle, int flags, StringBuilder key);
  [DllImport("rstrtmgr.dll", CharSet=CharSet.Unicode)] static extern int RmRegisterResources(uint handle, uint count, string[] files, uint apps, IntPtr processes, uint services, string[] names);
  [DllImport("rstrtmgr.dll")] static extern int RmGetList(uint handle, out uint needed, ref uint count, [In,Out] ProcessInfo[] processes, ref uint reasons);
  [DllImport("rstrtmgr.dll")] static extern int RmEndSession(uint handle);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFile(string path, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetFileInformationByHandle(SafeFileHandle handle, int type, ref byte data, uint size);
  public static int[] Owners(string file) {
    uint handle; if (RmStartSession(out handle, 0, new StringBuilder(33)) != 0) throw new IOException("usage-unavailable");
    try {
      if (RmRegisterResources(handle, 1, new[]{file}, 0, IntPtr.Zero, 0, null) != 0) throw new IOException("usage-unavailable");
      uint need=0, count=0, reasons=0;
      int result=RmGetList(handle, out need, ref count, null, ref reasons);
      if (result==0) return new int[0];
      if (result!=234) throw new IOException("usage-unavailable");
      var info=new ProcessInfo[need]; count=need;
      if (RmGetList(handle, out need, ref count, info, ref reasons)!=0) throw new IOException("usage-unavailable");
      var ids=new int[count]; for(int i=0; i<count; i++) ids[i]=info[i].Process.Id;
      return ids;
    } finally { RmEndSession(handle); }
  }
  public static FileStream OpenExclusive(string path) {
    var handle=CreateFile(path, 0x80010000, 0, IntPtr.Zero, 3, 0x00200000, IntPtr.Zero);
    if(handle.IsInvalid) { handle.Dispose(); throw new IOException("file-in-use-or-unavailable"); }
    return new FileStream(handle, FileAccess.Read);
  }
  public static void Delete(FileStream stream) {
    byte delete=1;
    if(!SetFileInformationByHandle(stream.SafeFileHandle, 4, ref delete, 1)) throw new IOException("delete-failed");
  }
}
'@
$inputData = [Console]::In.ReadToEnd() | ConvertFrom-Json
$streams = [Collections.Generic.List[IO.FileStream]]::new()
try {
  if ($Release) {
    foreach ($entry in $inputData) {
      if (@([PokeFileUsage]::Owners($entry.file)).Count -ne 0) { throw 'file-in-use' }
      if ((Get-Item -LiteralPath $entry.file -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'unsafe-path' }
      $stream = [PokeFileUsage]::OpenExclusive($entry.file)
      $streams.Add($stream)
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8, $true, 4096, $true)
      try { $metadata = $reader.ReadLine() | ConvertFrom-Json } finally { $reader.Dispose() }
      if ($metadata.type -ne 'session_meta' -or $metadata.payload.id -cne $entry.sessionId) { throw 'session-mismatch' }
    }
    foreach ($stream in $streams) { [PokeFileUsage]::Delete($stream) }
    Write-Output '{"ok":true}'
  } else {
    $result = foreach ($entry in $inputData) {
      $usage = 'unknown'
      try {
        $owners = @([PokeFileUsage]::Owners($entry.file))
        if ($owners.Count -eq 0) { $usage = 'inactive' }
        else {
          foreach ($owner in $owners) {
            if ([Diagnostics.Process]::GetProcessById($owner).ProcessName -eq 'codex') { $usage = 'active'; break }
          }
        }
      } catch { $usage = 'unknown' }
      [pscustomobject]@{ sessionId = $entry.sessionId; usage = $usage }
    }
    ConvertTo-Json -InputObject @($result) -Compress
  }
} catch { Write-Output '{"error":"file-in-use-or-validation-failed"}'; exit 1 }
finally { foreach ($stream in $streams) { $stream.Dispose() } }
