# Knowledge Base

## Overview 

Colorization is difficult because it is a multi-modal problem as a car could be green, black or blue. Greyscale images do not contain deterministic information about the ground truth. A good model need to identify local structures (texture, edges, ...) as well as the global semantic (objects, sceneries, context, ...) and be able to generate realistic colors and consistent results.

The modest important model types are:
- Classification-based models
    - lively colors
    - difficult to scale
    - e.g.: Deep Colorization (2015)
- GANs
    - generator vs. discriminator
    - realistic colors
    - high computational costs
    - e.g.: ChromaGAN, ParaColorizer, SS-CycleGAN, ColorRep
- diffusion models
    - newest trend
    - step-wise denoising of noisy samples conditioned on grayscale input
    - more stability in training
    - can generate diverse, semantically coherent outputs
    - also high computational cost and slow
    - e.g. Palette (2022)


### Generative Adversarial Networks (GANs)

Sources: [IBM](https://www.ibm.com/think/topics/generative-adversarial-networks)

#### How do GANs work? 
A GAN architecture consists of two deep neural networks: the generator network and the discriminator network. The GAN training process involves the generator starting with random input (noise) and creating synthetic data such as images, text or sound that mimics the real data from the given training set. The discriminator evaluates both the generated samples and the data from the training set and decides whether it’s real or fake. It assigns a score between 0 (predicts fake) and 1 (predicts real). Backpropagation is then used to optimize both the networks. This means that the gradient of the loss function is calculated according to the network's parameters, and these parameters are adjusted to minimize the loss. The generator then uses feedback from the discriminator to improve, trying to create more realistic data.

![General architecture of a GAN](https://assets.ibm.com/is/image/ibm/the-structure-of-a-gan?fmt=png-alpha&dpr=on%2C1&fit=fit%2C1&wid=1584&hei=541)

The generator model tries to trick the discriminative model into classifying fake data as real, while the discriminator continuously improves its ability to distinguish between real and fake data. This process is guided by loss functions that measure each network's performance. A generator loss measures how well the generator can deceive the discriminator into believing its data is real. A low generator loss means that the generator is successfully creating realistic data. A discriminator loss measures how well the discriminator can distinguish between fake data and real data. A low discriminator loss indicates the discriminator successfully identifying fake data.  

#### Types of GANs

##### Vanilla GANs

- Basic form of GANs
- includes a generator and discriminator
- simple multilayer perceptrons for both (easy implementation)
- known for being unstable during training and require careful tuning of hyperparameters to achieve good results

##### Conditional GANs (cGAN)

- includes additional information ('labels' or 'conditions') for both the generator and discriminator to provide context to enable the generator to produce data with specific characteristics based on the input
- makes cGANs useful for tasks requiring precise control over the output
- For example, a cGAN can convert a black-and-white image to a color image by conditioning the generator to transform grayscale into the red, green, blue color model (RGB).
- widely used for generating images, text and synthetic data tailored to specific objects, topics or styles.

##### Deep Convolutional GAN (DCGAN)

- uses CNNs for generator and discriminator
- effective for generating high-quality images and other structured data

##### StyleGAN

- produces high-res images (1024x1024)
- trained by using dataset of images of the same object

##### CycleGAN

- generator and discriminator trained in a cyclic manner
- useful for style transfer and image enhancement

##### Laplacian pyramid GAN (LAPGAN)

- designed to generate high-quality images by refining them at multiple scales
- progressively adds more details at higher resolution by using a series of GANs


### Diffusion Models

Source: [IBM](https://www.ibm.com/think/topics/diffusion-models)

Diffusion models important in generative AI. Popular text-to-image models are: Stability AI's Stable Diffusion, OpenAI’s DALL-E (beginning with DALL-E-2), Midjourney and Google’s Imagen. 

Intuition is inspired by physics: treating pixels like the molecules of a drop of ink spreading out in a glass of water over time. Much like how the random movement of the ink molecules will eventually lead to their even dispersal in the glass, the random introduction of noise into an image will eventually result in what looks like TV static. By modeling that diffusion process, then somehow learning to reverse it, an artificial intelligence model can generate new images by simply “denoising” samples of random noise.

##### Theory

Like most generative models, such as variational autoencoders (VAEs), Sohl-Dickstein’s algorithm modeled probability density: the relative likelihood of a randomly sampled variable, x, falling within a particular range of values. Essentially, modeling a probability density function for a training data set allows an algorithm to then generate samples that are highly likely to fit the training data distribution. When generating a new image, the model is assuming a high probability of pixel values being distributed in that specific way, based on the probability distribution it learned from patterns in training data.

Calculating a normalization constant that works for all possible variable values is often intractable: technically solvable, but requiring infinite time to compute. In such cases, likelihood-based models must either be restricted to specific model architectures or develop clever workarounds that approximate the normalization constant in a tractable way.

#### Training of diffusion models
In training, diffusion models gradually diffuse a data point with random noise, step-by-step, until it’s destroyed, then learn to reverse that diffusion process and reconstruct the original data distribution.

A trained diffusion model can then generate new data points that resemble the training data by simply denoising a random initial sample of pure noise. Conceptually, this is similar to a denoising autoencoder in which the noisy images act as latent variables.

Directly transforming random noise into a coherent image is extremely difficult and complex, but transforming a noisy image into a slightly less noisy image is relatively easy and straightforward. Diffusion models therefore formulate the reverse diffusion process as an incremental, step-by-step transformation of a simple distribution (like Gaussian noise) to a more complex distribution (like a coherent image).


## DDColor Model

### Core Ideas
- The paper argues that earlier CNN-based methods such as CIC, InstColor, and DeOldify often produce dull or semantically wrong colors, GAN-prior methods such as Wu et al. and BigColor can introduce artifacts, and transformer-based methods such as ColTran, CT2, and ColorFormer often depend on hand-crafted color priors or suffer from color bleeding.
- End-to-End architecture with two decoders: Pixel decoder for spatial detail, query-based color decoder for semantic color reasoning

- The model works in CIELAB color space. It receives the luminance channel L, i.e. the grayscale image, and predicts the missing chrominance channels A and B. The predicted AB channels are then concatenated with the input L channel to form the final color image.
- The architecture starts with a backbone encoder, specifically ConvNeXt-L in the main experiments, although the authors note that other hierarchical backbones such as ResNet or Swin Transformer could also be used. This encoder extracts multi-scale features at resolutions such as 1/4, 1/8, 1/16, and 1/32 of the input image. These features then feed into the two decoders.
- The pixel decoder restores spatial resolution. It is a feature upsampling pathway with shortcut connections from the encoder, similar in spirit to encoder-decoder designs used in dense prediction. Instead of deconvolution or interpolation, it uses PixelShuffle, a sub-pixel rearrangement operation known from super-resolution. Its output is a full-resolution image embedding: it knows “where things are” in the image.
- The color decoder is the more *novel part*. It uses learnable color queries, inspired by query-based transformers such as DETR, MaskFormer, and QueryInst. Instead of manually defining color bins, semantic-color mappings, or dataset-level color priors, the model learns a set of color embeddings directly from image features. Each color decoder block first performs cross-attention between color queries and visual features, then self-attention among the color queries, then an MLP. In simple terms: the queries look at the image features, decide which semantic regions they correspond to, then coordinate with one another to form a coherent color representation.
- A key design choice is that the color decoder uses multi-scale features from the pixel decoder, specifically 1/16, 1/8, and 1/4 scales. This matters because color bleeding often happens when a model understands global semantics but not fine boundaries. Multi-scale features let DDColor combine coarse semantic context with finer spatial information.
- Finally, a lightweight fusion module combines the pixel decoder output and color decoder output. It computes a dot product between the semantic-aware color embeddings and the per-pixel image embedding, then applies a 1×1 convolution to predict the AB channels. So the final color is not predicted only from local pixels, and not only from global semantic tokens, but from their interaction.

### Losses used during training

1. Pixel loss:
This is an L1 loss between the generated color image and the ground-truth image. L1 loss encourages the output to be close to the real image at the pixel level. It is useful for stabilizing training and preserving structure, but by itself it can encourage “average” colors, because many plausible colors may exist for the same grayscale input.

2. Perceptual loss:
The perceptual loss uses a pretrained VGG16 network. Instead of comparing only raw pixels, it compares deep feature activations of the generated and real images. This encourages the generated image to be semantically and visually similar to the target at a higher level: shapes, object appearance, and texture-like cues matter more than exact per-pixel equality.

3. Adversarial loss:
The authors use a PatchGAN discriminator, from the pix2pix image-to-image translation framework. A PatchGAN discriminator judges whether local image patches look real or fake. This pushes the generator toward more realistic local color and texture statistics, helping avoid flat or washed-out results.

4. Colorfulness loss.
This is the paper’s custom addition, inspired by the colorfulness score of Hasler and Suesstrunk. The loss is:


describe the spread and mean of pixels in a red-green/yellow-blue color plane. Intuitively, images with richer color variation have larger colorfulness scores. Because the loss subtracts this score from 1, minimizing it encourages more colorful outputs. This is meant to counter the dullness often seen in colorization models. The full generator objective is a weighted sum of pixel, perceptual, adversarial, and colorfulness losses, with weights λ

### Evaluation Metrics
The paper mainly uses FID, CF, ΔCF, and PSNR.

FID (Fréchet Inception Distance) measures *how similar the distribution of generated images is to the distribution of real images*, using features from an Inception network. Lower FID is better. It does not check whether each generated image matches the exact ground-truth colors, but whether the generated set looks statistically realistic. This is appropriate for colorization because many different colorizations can be valid.

CF (colorfulness score), measures how vivid or colorful an image is. Higher CF means stronger colorfulness. However, the paper emphasizes that higher CF is not always better: an oversaturated or unnatural image can score highly.

ΔCF is the difference between the colorfulness of the generated image and the ground-truth image. Lower ΔCF means the model’s colorfulness is closer to real images. This is important because it balances vividness with realism: the goal is not maximum color, but natural-looking color.

PSNR (Peak Signal-to-Noise Ratio) is a pixel-level reconstruction metric. Higher PSNR means closer pixel-wise similarity to the ground truth. The authors include it for reference but note, following prior colorization literature that pixel-level metrics are not ideal for colorization because the ground truth is only one of many possible valid color choices.

### Limitations

DDColor still struggles with transparent or translucent objects, where visual semantics and color boundaries are especially ambiguous. The authors also note that, like many automatic colorization systems, DDColor lacks user control: the model chooses plausible colors by itself, but the user cannot easily specify “make this object blue” or guide it with text prompts or color scribbles. They list such interactive controls as future work.