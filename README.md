# AWS CodeArtifact - Swift Registry Proof-of-Concept

A basic implementation of the [Swift package registry interface][registry]
that uses [AWS CodeArtifact] as a backend for package releases and assets.

This code was written as an exercise to see how compatible
the infrastructure of AWS CodeArtifact was to
the semantics of the proposed Swift package registry interface.

## Requirements

- TypeScript 4
- Node.js 14
- npm / Yarn

## Hypothetical Usage

A web application like the one provided here
would be deployed to one or more AWS endpoints.
Such a service is effectively a proxy layer,
translating between the Swift package registry interface and AWS.

All Swift Package Manager really needs is a URL to a compatible host
and credentials to authenticate requests with that server.
Following the example provided in the
[CodeArtifact documentation](https://docs.aws.amazon.com/codeartifact/latest/ug/npm-auth.html),
we might get both the URL and credentials
by running a command like this:

```terminal
$ aws codeartifact login --tool swift \
                         --repository my-repo \
                         --domain my-domain \
                         --domain-owner your-AWS-account-ID
Successfully authenticated Swift to access AWS CodeArtifact repository 
https://my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/
Login expires in 12 hours at 2020-12-18 12:34:56-08:00
```

For npm,
running `aws codeartifact login` updates the `.npmrc` configuration file
with the retrieved credentials.
The closest equivalent for Swift Package Manager is a `.netrc` file.

```netrc
machine my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com
login your-AWS-account-ID
password <token>
```

Additional configuration could be stored in `.swiftpm/config`,
which currently is used exclusively for persisting dependency mirror URLs.

Swift Package Manager is equipped to handle expiring credentials.
The real sticking point will be whether the URL returned by the `aws` CLI
is _stable_ or _unstable_.

- If this URL is _stable_,
  users can use it to construct URLs that locate package dependencies
  in that CodeArtifact repository.

```swift
// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "Example",
    dependencies: [
         .package(url: "https://my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/LinkedList", from: "1.1.0"),
    ],
    targets: [
        .target(name: "Example", dependencies: ["LinkedList"])
    ]
)
```

- If the URL is _unstable_,
  there are a few different approaches we could take.

  - Specifying a stable placeholder URL in the package manifest and,
    when running the `aws codeartifact login` command,
    setting a mirror to the repository endpoint:

    ```terminal
    $ aws codeartifact login # ...
    $ cat .swiftpm/config
    {
      "object": [
        {
          "mirror": "https://my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/LinkedList",
          "original": "https://placeholder.example.com/my-repo/LinkedList"
        }
      ]
    }
    ``` 

  - Programmatically updating package manifest files with the new URL:

    ```diff
      dependencies: [
    -     .package(url: "https://my-domain-____________.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/LinkedList", from: "1.1.0"),
    +     .package(url: "https://my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/LinkedList", from: "1.1.0"),
      ],
    ```
  
  - Performing authentication as part of package resolution,
    taking advantage of the fact that `Package.swift` is executable code:

    ```swift
    // swift-tools-version:5.3
    import PackageDescription
    import AWSCodeArtifact

    var package = Package(
        name: "Example",
        dependencies: [
             .package(url: "https://my-domain-123456789012.d.codeartifact.us-west-2.amazonaws.com/swift/my-repo/LinkedList", from: "1.1.0"),
        ],
        targets: [
            .target(name: "Example", dependencies: ["LinkedList"])
        ]
    )

    let environment = ProcessInfo.processInfo.environment
    environment["AWS_ACCESS_KEY_ID"]
    environment["AWS_SECRET_ACCESS_KEY"]
    environment["AWS_DEFAULT_REGION"]

    let client = AWSCodeArtifact.Client(accessKeyID: environment["AWS_ACCESS_KEY_ID"],
                                        secretAccessKey: environment["AWS_SECRET_ACCESS_KEY"],
                                        options: [
                                            .defaultRegion: environment["AWS_DEFAULT_REGION"]
                                        ])

    let codeArtifactPackages: [(Identifier, Package.Dependency.Requirement)] = [
        ("my-repo/LinkedList", .upToNextMinor(from: "1.1.0"))
    ]

    package.dependencies += try client.resolve(codeArtifactPackages)
    ```

Each of these approaches has its set of tradeoffs,
which we can explore and discuss further.

## Contact

Mattt ([@mattt](https://twitter.com/mattt))

[registry]: https://github.com/apple/swift-package-manager/blob/872ce5c7dfcf4df7cb8b636db4aa9707ba6e416e/Documentation/Registry.md
[AWS CodeArtifact]: https://aws.amazon.com/codeartifact/
