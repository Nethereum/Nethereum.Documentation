---
title: Encode and Decode ABI Data
sidebar_label: "ABI Encoding"
sidebar_position: 3
description: Low-level ABI encoding and decoding for smart contract interaction
---

Learn how Ethereum's ABI encoding works for function calls, events, and errors.

## Install

```bash
dotnet add package Nethereum.ABI
```

## Function Selectors

A function selector is the first 4 bytes of the Keccak-256 hash of the function signature.

<!-- tag:AbiEncodingDocExampleTests:ShouldCalculateFunctionSelector -->
```csharp
var keccak = Sha3Keccack.Current;
var transferSignature = "transfer(address,uint256)";
var fullHash = keccak.CalculateHash(transferSignature);
var selector = fullHash.Substring(0, 8); // "a9059cbb"
```

## Encode Function Calls

<!-- tag:AbiEncodingDocExampleTests:ShouldEncodeBasicFunctionCall -->
```csharp
var functionCallEncoder = new FunctionCallEncoder();
var sha3Signature = "a9059cbb";
var inputsParameters = new[]
{
    new Parameter("address", "to") { DecodedType = typeof(string) },
    new Parameter("uint256", "value") { DecodedType = typeof(BigInteger) }
};

var result = functionCallEncoder.EncodeRequest(sha3Signature, inputsParameters,
    "1234567890abcdef1234567890abcdef12345678", new BigInteger(1000));
```

The result is a hex string: the 4-byte selector followed by 32-byte ABI-encoded parameters.

## Use Parameter Attributes

Define a typed DTO instead of building parameters manually.

<!-- tag:AbiEncodingDocExampleTests:ShouldEncodeUsingParameterAttributes -->
```csharp
[Function("transfer")]
public class TransferFunction
{
    [Parameter("address", "to", 1)]
    public string To { get; set; }
    [Parameter("uint256", "amount", 2)]
    public BigInteger Amount { get; set; }
}

var input = new TransferFunction
{
    To = "1234567890abcdef1234567890abcdef12345678",
    Amount = new BigInteger(5000)
};

var result = new FunctionCallEncoder().EncodeRequest(input, "a9059cbb");
```

## Decode Output

<!-- tag:AbiEncodingDocExampleTests:ShouldDecodeFunctionOutput -->
```csharp
var functionCallDecoder = new FunctionCallDecoder();

var outputParameters = new[]
{
    new ParameterOutput
    {
        Parameter = new Parameter("uint256", "balance") { DecodedType = typeof(BigInteger) }
    }
};

var encodedOutput = "0x" +
    "0000000000000000000000000000000000000000000000000000000000000045";

var result = functionCallDecoder.DecodeOutput(encodedOutput, outputParameters);
// result[0].Result == 69 (BigInteger)
```

## Decode Event Topics

Events use indexed parameters as log topics. The first topic is the event signature hash.

<!-- tag:AbiEncodingDocExampleTests:ShouldDecodeTransferEventTopic -->
```csharp
[Event("Transfer")]
public class TransferEventDTO
{
    [Parameter("address", "_from", 1, true)]
    public string From { get; set; }
    [Parameter("address", "_to", 2, true)]
    public string To { get; set; }
    [Parameter("uint256", "_value", 3, true)]
    public BigInteger Value { get; set; }
}

var topics = new[]
{
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x000000000000000000000000c14934679e71ef4d18b6ae927fe2b953c7fd9b91",
    "0x0000000000000000000000000000000000000000000000400000402000000001"
};

var transferDto = new TransferEventDTO();
new EventTopicDecoder().DecodeTopics(transferDto, topics, "0x");
```

## Deserialize a Contract ABI

Parse a JSON ABI string into a strongly-typed contract model.

<!-- tag:AbiEncodingDocExampleTests:ShouldDeserializeContractAbi -->
```csharp
var abi = @"[{""constant"":false,""inputs"":[{""name"":""a"",""type"":""uint256""}],
""name"":""multiply"",""outputs"":[{""name"":""d"",""type"":""uint256""}],""type"":""function""},
{""anonymous"":false,""inputs"":[{""indexed"":true,""name"":""from"",""type"":""address""},
{""indexed"":true,""name"":""to"",""type"":""address""},{""indexed"":false,""name"":""value"",
""type"":""uint256""}],""name"":""Transfer"",""type"":""event""}]";

var des = new ABIJsonDeserialiser();
var contract = des.DeserialiseContract(abi);
// contract.Functions.Length == 2, contract.Events.Length == 1
```

## Decode Custom Errors

Solidity custom errors are ABI-encoded with a 4-byte selector, just like functions.

<!-- tag:AbiEncodingDocExampleTests:ShouldDecodeCustomError -->
```csharp
var error = new ErrorABI("InsufficientBalance");
error.InputParameters = new[]
{
    new Parameter("address", "account", 1),
    new Parameter("uint256", "balance", 2)
};

var errorSelector = error.Sha3Signature;
var encodedData = "0x" + errorSelector +
    "000000000000000000000000c14934679e71ef4d18b6ae927fe2b953c7fd9b91" +
    "0000000000000000000000000000000000000000000000000000000000000064";

var decoder = new FunctionCallDecoder();
var decoded = decoder.DecodeError(error, encodedData);
// decoded[0].Result == "0xc14934679e71ef4d18b6ae927fe2b953c7fd9b91"
// decoded[1].Result == 100 (BigInteger)
```

## Individual Type Encoding

Each Solidity type has an encoder that produces a 32-byte padded value.

<!-- tag:AbiEncodingDocExampleTests:ShouldEncodeIndividualTypesWithPadding -->
```csharp
var addressEncoded = new AddressType()
    .Encode("1234567890abcdef1234567890abcdef12345678");  // 32 bytes

var intEncoded = new IntType("uint256")
    .Encode(new BigInteger(42));  // 32 bytes

var boolEncoded = new BoolType()
    .Encode(true);  // 32 bytes

var bytes32Type = new Bytes32Type("bytes32");
var bytes32Value = new byte[32];
bytes32Value[0] = 0xAB;
var bytes32Encoded = bytes32Type.Encode(bytes32Value);  // 32 bytes
```

## Next Steps

- [Guide: Hex Encoding](guide-hex-encoding.md) -- convert between bytes, strings, and hex
- [Smart Contracts overview](overview.md)

## Package References

- [Nethereum.ABI](nethereum-abi.md)
