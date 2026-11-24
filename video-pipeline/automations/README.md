# Slack automation setup

In Devin Automations, create a Slack-message trigger from [this manifest](slack-trigger.yml).
Connect the owning Slack workspace, select `#video-pipeline`, and use the manifest's
condition and instructions. Use the owner's weekly deadline and time zone for a separate
scheduled reminder; suppress it when an approved script already arrived. These values
and the Slack connection must be supplied by the owner. The manifest is not activated
by adding it to the repository.
