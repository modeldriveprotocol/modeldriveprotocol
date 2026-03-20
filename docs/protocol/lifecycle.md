---
title: Lifecycle
status: MVP
---

# Lifecycle

Client lifecycle:

1. connect
2. register
3. expose capabilities
4. handle routed calls
5. heartbeat
6. unregister or disconnect

Server lifecycle:

1. accept transport
2. store client session
3. index capabilities
4. route requests
5. clean up on timeout or disconnect

