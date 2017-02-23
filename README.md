# MeasureSlicer
Measure Slicer is a visual that lets you slice categories by measure value instead of category.

It's original aim is to allow a report in a Tabular model to be filtered by data relevant to the current user without having to impose the broad security restriction of row level security.

It works by taking a category and a measure.  Like a table, it computes the measure value for each category value, but instead of displaying each line it only displays the distinct measure values.  When you select one or more measure values it then acts like a regular category filter would if you had selected all of the individual category values that match the selected measure values.

This accomplishes the original aim by allowing the developer to define a measure in DAX that evaluates to "Is Me" when there is a single worker in the current context and that user is the user running the report.  As an example, the DAX for a simple version of this is as follows:
IF(	COUNTROWS('Worker')=1 && FIRSTNONBLANK('Worker'[User Id],1) = USERNAME(),
    "Is Me",
    BLANK()
)

If the measure evaluates to (blank), the Measure Slicer will ignore the category.

Of course, you can get far more creative with this and add relative positions within a hierarchy or even use it for things completely unrelated to the current user.  

There is also a "default value" property which auto-selects the measure which matches the default value.

The biggest limitation is that your chosen category cannot have more than 10,000 unique values.  

This visual is a quick and dirty way to solve a specific problem.  There are probably better ways to do this, and I have no doubt that something that does this better will get put out eventually by the Power BI team (or maybe even the Tabular database team).  Until then, though, use this if it works for you.  If it does not work for you, feel free to expand this code and make it better.  I may do simple updates, but I will not be adding major features regularly.  Working with the Power BI visual API (and TypeScript in general) is too arduous to get ROI out of me making drastic improvements to this code.
