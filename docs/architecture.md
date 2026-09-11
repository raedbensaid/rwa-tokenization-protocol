# Architecture

## Overview

The RWA Tokenization Protocol consists of several components:

- Asset Registry
- Asset Token
- Compliance Registry
- NAV Oracle
- Redemption Module
- Dividend Distributor
- Treasury

## High-Level Architecture

Issuer
    |
    v
Asset Registry
    |
    v
Asset Token
    |
    +---- Investor A
    |
    +---- Investor B

Compliance Registry
    |
    v
Transfer Authorization

NAV Oracle
    |
    v
Asset Valuation

Treasury
    |
    +---- Redemption
    |
    +---- Dividends