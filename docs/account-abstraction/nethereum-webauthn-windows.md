---
title: "Nethereum.WebAuthn.Windows"
sidebar_label: "Nethereum.WebAuthn.Windows"
sidebar_position: 100
description: "Nethereum.WebAuthn.Windows implements [Nethereum.WebAuthn](../Nethereum.WebAuthn/README.md)'s"
custom_edit_url: "https://github.com/Nethereum/Nethereum/edit/master/src/Nethereum.WebAuthn.Windows/README.md"
format: md
---

# Nethereum.WebAuthn.Windows

> **NuGet**: [`Nethereum.WebAuthn.Windows`](https://www.nuget.org/packages/Nethereum.WebAuthn.Windows/) | **Source**: [`src/Nethereum.WebAuthn.Windows/`](https://github.com/Nethereum/Nethereum/tree/master/src/Nethereum.WebAuthn.Windows)
**Nethereum.WebAuthn.Windows** implements [Nethereum.WebAuthn](nethereum-webauthn)'s
`IWebAuthnAuthenticator` / `IWebAuthnCredentialFactory` over the Win32 `webauthn.dll` API, so a
desktop app (Avalonia, WPF, WinUI) gets a real, OS-native Windows Hello passkey - no browser
required.

## Requirements

- Windows 10 version 1809 or later (`webauthn.dll` ships in-box since then).
- A registered Windows Hello sign-in (PIN, fingerprint, face) or an attached security key.

## Installation

```bash
dotnet add package Nethereum.WebAuthn.Windows
```

## Registering the authenticator

```csharp
// composition root
services.AddNethereumWebAuthnWindows();
```

```csharp
public static IServiceCollection AddNethereumWebAuthnWindows(
    this IServiceCollection services,
    bool requireUserVerificationForAssertion = true,
    bool fallbackToSoftwareOffWindows = true)
```

On Windows 10 1809+, this registers a singleton `WindowsWebAuthnAuthenticator` under both
`IWebAuthnAuthenticator` and `IWebAuthnCredentialFactory`. Off Windows (macOS/Linux dev machines,
Linux CI), the same two interfaces resolve to `Nethereum.WebAuthn`'s `SoftwareWebAuthnAuthenticator`
by default - a real P-256 key held in process memory, useful for running the same app/tests
cross-platform, but **not** a real passkey ceremony: no OS credential store, no biometric prompt, no
hardware-backed key. Pass `fallbackToSoftwareOffWindows: false` to instead throw
`PlatformNotSupportedException` on first resolve off Windows.

This cross-platform-TFM + software-fallback design is what lets a shared app project (an Avalonia
view model, for instance) depend on `IWebAuthnAuthenticator` / `IWebAuthnCredentialFactory` without
`#if WINDOWS` conditionals, and still run its tests on any OS.

## Usage

```csharp
using System.Threading.Tasks;
using Nethereum.WebAuthn;

public class PasskeyService
{
    private readonly IWebAuthnCredentialFactory _credentialFactory;
    private readonly IWebAuthnAuthenticator _authenticator;

    public PasskeyService(IWebAuthnCredentialFactory credentialFactory, IWebAuthnAuthenticator authenticator)
    {
        _credentialFactory = credentialFactory;
        _authenticator = authenticator;
    }

    public async Task<WebAuthnAccountSigningService> RegisterAsync()
    {
        var created = await _credentialFactory.CreateCredentialAsync(new WebAuthnCredentialCreationOptions
        {
            RpId = "nethereum.local",
            RpName = "My Nethereum App",
            UserName = "alice",
            RequireUserVerification = true
        });

        // credentialId is the ON-CHAIN id (keccak of the public key); platformCredentialId is
        // Windows Hello's own credential handle used to select the passkey for the assertion - see
        // Nethereum.WebAuthn's two-id model.
        return new WebAuthnAccountSigningService(
            _authenticator, created.OnChainCredentialId, rpId: "nethereum.local",
            platformCredentialId: created.PlatformCredentialId);
    }
}
```

This is the desktop-backed half of a passkey account. For the ERC-7579 validator module, the account
init data, and the full create + send flow through `IAAClient`, see
[Nethereum.AccountAbstraction.WebAuthn](nethereum-accountabstraction-webauthn)'s Quick
Start - it uses `SoftwareWebAuthnAuthenticator` for a runnable example, and swapping it for the
`WindowsWebAuthnAuthenticator` registered here is a one-line change; nothing else in that flow
differs.

## Supplying the prompt's parent window: `IWindowHandleProvider`

```csharp
public interface IWindowHandleProvider
{
    IntPtr GetWindowHandle();
}
```

`AddNethereumWebAuthnWindows` parents the Windows Hello UI to the current foreground window by
default (`ForegroundWindowHandleProvider`). To parent it to your app's own window instead, implement
`IWindowHandleProvider` and construct `WindowsWebAuthnAuthenticator` directly:

```csharp
public class MainWindowHandleProvider : IWindowHandleProvider
{
    public IntPtr GetWindowHandle() => _mainWindowHandle;
}

services.AddSingleton(sp => new WindowsWebAuthnAuthenticator(sp.GetRequiredService<MainWindowHandleProvider>()));
```

## Notes

- All parsing (DER signatures, COSE public keys, authenticatorData) is delegated to
  `Nethereum.WebAuthn.WebAuthnResponseParser` - this package only owns the native `webauthn.dll` call
  and the unmanaged buffer marshaling around it (see `NativeWebAuthn.cs`, which mirrors the Windows
  SDK's `webauthn.h` struct layouts).
- The live Windows Hello prompt (an actual OS UI, requiring an enrolled biometric/PIN) cannot run in a
  headless test suite; it is exercised manually in the Avalonia AA demo. The unit tests in
  `tests/Nethereum.WebAuthn.Windows.UnitTests` instead verify the clientDataJSON construction and the
  native-buffer-to-`WebAuthnAssertion`/`WebAuthnCreatedCredential` mapping (`WindowsWebAuthnAuthenticator`'s
  public `Build*ClientDataJson`/`Map*` helpers) against real BCL-generated P-256 keys/signatures, plus
  the off-Windows software fallback registration.
- `WindowsWebAuthnAuthenticator` only ever requests the *platform* authenticator (Windows Hello
  itself), never a cross-platform/security-key one.

## Related Packages

- **[Nethereum.WebAuthn](nethereum-webauthn)** - the platform-agnostic seams, the two-id model, `SoftwareWebAuthnAuthenticator`
- **[Nethereum.AccountAbstraction.WebAuthn](nethereum-accountabstraction-webauthn)** - the ERC-7579 validator module + end-to-end account create/send flow
- **[Nethereum.WebAuthn.Blazor](nethereum-webauthn-blazor)** - the browser equivalent of this package

## Additional Resources

- [WebAuthn Level 2 (W3C)](https://www.w3.org/TR/webauthn-2/)
- [Web Authentication APIs (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/api/webauthn/)
- [Nethereum Documentation](https://docs.nethereum.com)
