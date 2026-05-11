from huggingface_hub import PyTorchModelHubMixin
from ddcolor import DDColor

class DDColorHF(DDColor, PyTorchModelHubMixin):
    def __init__(self, config=None, **kwargs):
        if isinstance(config, dict):
            kwargs = {**config, **kwargs}
        super().__init__(**kwargs)

DDColorHF.from_pretrained("piddnad/ddcolor_modelscope")
print("✅ Model cached successfully")
