# Bugfix Requirements Document

## Introduction

The "Below Market" (and other verdict) status card in the Salary Coach screen (`SalaryNegotiationScreen.tsx`) displays an excessively thick/double border. This is caused by the base `resultCard` style applying `borderWidth: 1` and `borderColor: theme.border`, while the verdict card's inline style only overrides `borderColor` with the verdict color — leaving both border declarations active and producing a visually unappealing double-border effect.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the verdict result card is rendered THEN the system applies both the base `resultCard` `borderWidth: 1` / `borderColor: theme.border` AND an inline `borderColor` override, resulting in a thick double-border appearance.

1.2 WHEN the verdict is "Below Market", "Fair Offer", or "Above Market" THEN the system renders the card with a border that appears much thicker than the single 1px border intended.

### Expected Behavior (Correct)

2.1 WHEN the verdict result card is rendered THEN the system SHALL display a single, 1px border whose color matches the verdict color at 60% opacity.

2.2 WHEN the verdict is "Below Market", "Fair Offer", or "Above Market" THEN the system SHALL render the card with exactly one visible border, using the verdict-specific color, with no double-border artifact.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN non-verdict result cards (Market Data, Leverage, Script, Email, Tactics) are rendered THEN the system SHALL CONTINUE TO display a 1px border using `theme.border`.

3.2 WHEN the verdict card background color is applied THEN the system SHALL CONTINUE TO use the verdict color at 20% opacity as the background fill.

3.3 WHEN the verdict card border color is applied THEN the system SHALL CONTINUE TO use the verdict color at 60% opacity for the border.
