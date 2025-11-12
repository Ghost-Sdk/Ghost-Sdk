from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="ghost-sdk",
    version="0.1.0",
    author="Ghost SDK Team",
    author_email="team@ghost-sdk.com",
    description="Privacy SDK for Solana - Python bindings",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ghost-sdk/python",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "solana>=0.30.0",
        "solders>=0.18.0",
        "pynacl>=1.5.0",
        "cryptography>=41.0.0",
        "base58>=2.1.1",
        "typing-extensions>=4.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=23.0.0",
            "mypy>=1.0.0",
            "pylint>=2.17.0",
        ],
    },
)
