import pytest
import os
import sys

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import test modules
from tests.test_entry import *
from tests.test_subscription import *
from tests.test_admin import *
from tests.test_nudge import *
from tests.test_export import *

if __name__ == "__main__":
    pytest.main(["-v"])
