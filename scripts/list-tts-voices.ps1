Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
Write-Output "=== Installed Windows TTS voices ==="
foreach ($v in $s.GetInstalledVoices()) {
  $i = $v.VoiceInfo
  Write-Output ("{0} | {1} | Enabled={2}" -f $i.Name, $i.Culture.Name, $v.Enabled)
}
